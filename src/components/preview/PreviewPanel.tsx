import { useState, useRef, useEffect } from "react";
import { ExternalLink, RotateCcw, Check, AlertCircle, GitBranch, Settings, MousePointer, Loader2, RefreshCw, GitPullRequest, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiffViewer from "./DiffViewer";
import DeploymentStatus from "./DeploymentStatus";
import PreviewFrame from "./PreviewFrame";
import FileList from "./FileList";
import ElementInfoPanel from "./ElementInfoPanel";
import BranchStatus from "./BranchStatus";
import CreatePRModal from "./CreatePRModal";
import { useDeployment } from "@/hooks/useDeployment";
import { useCodeChanges } from "@/hooks/useCodeChanges";
import { useChangeRequests } from "@/hooks/useChangeRequests";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useBranchDeployment } from "@/hooks/useBranchDeployment";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ElementInfo } from "@/lib/visual-edit-injector";

type Tab = "preview" | "changes" | "files";

interface PreviewPanelProps {
  projectId: string;
  vercelProjectId: string | null;
  githubRepo: string | null;
  conversationId?: string;
  onSendToAI?: (element: ElementInfo, request: string) => void;
  onVercelSetup?: (vercelProjectId: string) => void;
  onScreenshotCapture?: (url: string) => void;
}

const PreviewPanel = ({ projectId, vercelProjectId, githubRepo, conversationId, onSendToAI, onVercelSetup, onScreenshotCapture }: PreviewPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [showBefore, setShowBefore] = useState(false);
  const [visualEditMode, setVisualEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [isSettingUpVercel, setIsSettingUpVercel] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  
  const { organization } = useOrganization();
  const { canMerge } = useUserRole(organization?.id);
  const { deployment, status, triggerDeployment } = useDeployment(vercelProjectId);
  const { changes, approveChanges } = useCodeChanges(projectId, conversationId);
  const { createChangeRequest } = useChangeRequests(projectId);
  const { session } = useAgentSession(projectId);
  const { deployment: branchDeployment, loading: branchLoading } = useBranchDeployment(
    session?.vercel_project_id || vercelProjectId,
    session?.current_branch
  );
  const prevVercelProjectId = useRef(vercelProjectId);

  // Auto-trigger deployment when Vercel project is newly set up
  useEffect(() => {
    if (vercelProjectId && !prevVercelProjectId.current) {
      triggerDeployment();
    }
    prevVercelProjectId.current = vercelProjectId;
  }, [vercelProjectId, triggerDeployment]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "preview", label: "Preview" },
    { id: "changes", label: "Changes", badge: changes.filter(c => !c.approved_at).length || undefined },
    { id: "files", label: "Files" },
  ];

  // Use branch deployment URL if available, otherwise fall back to main deployment
  const branchUrl = branchDeployment?.url;
  const rawUrl = branchUrl || (deployment?.url 
    ? (deployment.url.startsWith('http') ? deployment.url : `https://${deployment.url}`)
    : null);
  const previewUrl = rawUrl;

  const handleElementSelected = (element: ElementInfo) => {
    setSelectedElement(element);
  };

  const handleSendToAI = (request: string) => {
    if (selectedElement && onSendToAI) {
      onSendToAI(selectedElement, request);
      setSelectedElement(null);
      setVisualEditMode(false);
    }
  };

  const handleCloseElementPanel = () => {
    setSelectedElement(null);
  };

  const toggleVisualEditMode = () => {
    const newMode = !visualEditMode;
    setVisualEditMode(newMode);
    if (!newMode) {
      setSelectedElement(null);
    }
  };

  const handleApproveChanges = async () => {
    const unapprovedChanges = changes.filter(c => !c.approved_at);
    if (unapprovedChanges.length === 0) {
      toast.info("No pending changes to approve");
      return;
    }

    setIsApproving(true);
    try {
      // Approve all pending changes in database
      await approveChanges(unapprovedChanges.map(c => c.id));

      // Push changes to GitHub if we have session context
      if (session?.current_branch && session?.github_owner && session?.github_repo) {
        const filesToCommit = unapprovedChanges
          .filter(c => c.modified_content) // Only files with content
          .map(c => ({
            path: c.file_path,
            content: c.modified_content
          }));

        if (filesToCommit.length > 0) {
          toast.info("Pushing changes to GitHub...");
          
          const { error: pushError } = await supabase.functions.invoke('github-commit-push', {
            body: {
              owner: session.github_owner,
              repo: session.github_repo,
              branch: session.current_branch,
              message: `Approved ${unapprovedChanges.length} AI-generated changes`,
              files: filesToCommit,
              baseBranch: session.current_branch
            }
          });

          if (pushError) {
            console.error('Failed to push to GitHub:', pushError);
            toast.error('Changes approved but failed to push to GitHub');
          } else {
            toast.success("Changes pushed! Vercel will auto-deploy.");
          }
        }
      }

      // Create a change request for team visibility
      const filePaths = unapprovedChanges.map(c => c.file_path).join(", ");
      await createChangeRequest({
        title: `Changes approved: ${unapprovedChanges.length} files`,
        description: `Files modified: ${filePaths}`,
        conversationId,
        deploymentId: deployment?.id
      });

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: project } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', projectId)
          .single();

        if (project?.organization_id) {
          await supabase.from('activity_log').insert({
            organization_id: project.organization_id,
            project_id: projectId,
            user_id: user.id,
            action: 'changes_approved',
            metadata: {
              files_count: unapprovedChanges.length,
              file_paths: unapprovedChanges.map(c => c.file_path)
            }
          });
        }
      }

      toast.success(`Approved ${unapprovedChanges.length} changes`);
    } catch (error) {
      console.error('Failed to approve changes:', error);
      toast.error('Failed to approve changes');
    } finally {
      setIsApproving(false);
    }
  };

  const handleSetupVercel = async () => {
    if (!githubRepo || !projectId) return;
    
    setIsSettingUpVercel(true);
    try {
      // Extract project name from GitHub repo
      const repoMatch = githubRepo.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
      const projectName = repoMatch ? repoMatch[2] : 'project';
      
      // Create Vercel project
      const { data, error } = await supabase.functions.invoke('vercel-create-project', {
        body: { 
          name: projectName,
          githubRepo,
          framework: 'vite'
        }
      });
      
      if (error) throw error;
      
      if (data?.projectId) {
        // Update the project with Vercel ID
        await supabase.functions.invoke('update-project-vercel', {
          body: { projectId, vercelProjectId: data.projectId }
        });
        
        toast.success('Vercel project created! Starting deployment...');
        
        // Call callback to update parent state instead of reloading
        if (onVercelSetup) {
          onVercelSetup(data.projectId);
        }
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: any) {
      console.error('Error setting up Vercel:', e);
      toast.error(`Failed to setup Vercel: ${e.message}`);
    } finally {
      setIsSettingUpVercel(false);
    }
  };

  // Show setup state if no Vercel project is configured
  if (!vercelProjectId) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-foreground font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <DeploymentStatus status="idle" />
        </div>
        
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/20 p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="max-w-sm text-center">
            <p className="text-sm font-medium text-foreground">Deployment not configured</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {githubRepo 
                ? "Click below to set up automatic deployments with Vercel."
                : "Connect a GitHub repository to enable automatic deployments and live previews."}
            </p>
          </div>
          {githubRepo && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{githubRepo}</span>
              </div>
              <Button 
                onClick={handleSetupVercel} 
                disabled={isSettingUpVercel}
                size="sm"
              >
                {isSettingUpVercel ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Setup Vercel Deployment'
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  const pendingChangesCount = changes.filter(c => !c.approved_at).length;

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-border px-4">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <DeploymentStatus status={status} />
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-auto">
        {activeTab === "preview" && (
          <div className="flex h-full flex-col animate-fade-in">
            {/* Preview header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-3">
                {/* Branch status - shows user's current branch if available */}
                {session?.current_branch ? (
                  <BranchStatus
                    branch={session.current_branch}
                    deployment={branchDeployment}
                    loading={branchLoading}
                    githubOwner={session.github_owner}
                    githubRepo={session.github_repo}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {rawUrl ? rawUrl.replace("https://", "") : "No deployment yet"}
                  </span>
                )}
                
                {/* Before/After toggle */}
                <div className="flex rounded-md border border-border bg-background">
                  <button
                    onClick={() => setShowBefore(false)}
                    className={`px-2.5 py-1 text-xs transition-colors ${
                      !showBefore
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    After
                  </button>
                  <button
                    onClick={() => setShowBefore(true)}
                    className={`px-2.5 py-1 text-xs transition-colors ${
                      showBefore
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Before
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Visual Edit Toggle */}
                {rawUrl && (
                  <Button
                    variant={visualEditMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={toggleVisualEditMode}
                  >
                    <MousePointer className="h-3 w-3" />
                    {visualEditMode ? "Exit Edit" : "Visual Edit"}
                  </Button>
                )}
                {/* Screenshot button */}
                {rawUrl && onScreenshotCapture && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => onScreenshotCapture(rawUrl)}
                  >
                    <Camera className="h-3 w-3" />
                    Screenshot
                  </Button>
                )}
                {/* Redeploy button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => triggerDeployment()}
                  disabled={status === "building"}
                >
                  <RefreshCw className={`h-3 w-3 ${status === "building" ? "animate-spin" : ""}`} />
                  {status === "building" ? "Building..." : "Redeploy"}
                </Button>
                {/* Open in new tab - single consolidated button */}
                {rawUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    asChild
                  >
                    <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Preview iframe or states */}
            {status === "failed" ? (
              <ErrorDisplay
                error={deployment?.error}
                onRetry={() => triggerDeployment()}
              />
            ) : status === "building" ? (
              <BuildingState />
            ) : status === "idle" && !previewUrl ? (
              <IdleState onDeploy={() => triggerDeployment()} />
            ) : previewUrl ? (
              <PreviewFrame 
                url={previewUrl} 
                showBefore={showBefore}
                visualEditMode={visualEditMode}
                onElementSelected={handleElementSelected}
                onVisualEditCancel={() => setVisualEditMode(false)}
              />
            ) : (
              <IdleState onDeploy={() => triggerDeployment()} />
            )}

            {/* Element Info Panel */}
            {selectedElement && (
              <ElementInfoPanel
                element={selectedElement}
                onClose={handleCloseElementPanel}
                onSendToAI={handleSendToAI}
              />
            )}
          </div>
        )}

        {activeTab === "changes" && (
          <div className="p-4 animate-fade-in">
            <DiffViewer projectId={projectId} conversationId={conversationId} />
          </div>
        )}

        {activeTab === "files" && (
          <div className="p-4 animate-fade-in">
            <FileList 
              projectId={projectId} 
              conversationId={conversationId}
              onFileClick={() => setActiveTab("changes")}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border p-4">
        <Button variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Undo
        </Button>
        
        {/* Create PR button - only for owners/admins with an active branch */}
        {canMerge && session?.current_branch && session.current_branch !== 'main' && session.github_owner && session.github_repo && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowPRModal(true)}
          >
            <GitPullRequest className="h-3.5 w-3.5" />
            Create PR
          </Button>
        )}
        
        <Button 
          size="sm" 
          className="ml-auto gap-1.5"
          onClick={handleApproveChanges}
          disabled={isApproving || pendingChangesCount === 0}
        >
          {isApproving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          {pendingChangesCount > 0 
            ? `Approve ${pendingChangesCount} changes` 
            : "Approve changes"
          }
        </Button>
      </div>

      {/* Create PR Modal */}
      {session?.github_owner && session?.github_repo && session?.current_branch && (
        <CreatePRModal
          open={showPRModal}
          onOpenChange={setShowPRModal}
          githubOwner={session.github_owner}
          githubRepo={session.github_repo}
          headBranch={session.current_branch}
          onPRCreated={(prUrl) => {
            toast.success("PR created! Review it on GitHub.");
          }}
        />
      )}
    </div>
  );
};

const BuildingState = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/20 p-8">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
    <div className="text-center">
      <p className="text-sm font-medium text-foreground">Building preview...</p>
      <p className="mt-1 text-xs text-muted-foreground">
        This usually takes 10-30 seconds
      </p>
    </div>
  </div>
);

const IdleState = ({ onDeploy }: { onDeploy: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/20 p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <GitBranch className="h-6 w-6 text-muted-foreground" />
    </div>
    <div className="max-w-sm text-center">
      <p className="text-sm font-medium text-foreground">Ready to deploy</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Click the button below to trigger a new deployment from your repository.
      </p>
    </div>
    <Button size="sm" onClick={onDeploy}>
      Deploy now
    </Button>
  </div>
);

const ErrorDisplay = ({ error, onRetry }: { error?: string | null; onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/20 p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
      <AlertCircle className="h-6 w-6 text-destructive" />
    </div>
    <div className="max-w-sm text-center">
      <p className="text-sm font-medium text-foreground">Build failed</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {error || "An error occurred during the build process."}
      </p>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry build
      </Button>
    </div>
  </div>
);

export default PreviewPanel;
