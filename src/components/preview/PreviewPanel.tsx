import { useState, useRef, useEffect } from "react";
import { ExternalLink, RotateCcw, AlertCircle, GitBranch, Settings, MousePointer, Loader2, RefreshCw, Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import DiffViewer from "./DiffViewer";
import DeploymentStatus from "./DeploymentStatus";
import PreviewFrame from "./PreviewFrame";
import FileList from "./FileList";
import ElementInfoPanel from "./ElementInfoPanel";
import BranchStatus from "./BranchStatus";
import ChangeShareDialog from "@/components/team/ChangeShareDialog";
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
  onPreviewUrlChange?: (url: string | null) => void;
}

const PreviewPanel = ({ projectId, vercelProjectId, githubRepo, conversationId, onSendToAI, onVercelSetup, onScreenshotCapture, onPreviewUrlChange }: PreviewPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [visualEditMode, setVisualEditMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [isSettingUpVercel, setIsSettingUpVercel] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const { organization } = useOrganization();
  const { canMerge } = useUserRole(organization?.id);
  const { deployment, status, triggerDeployment } = useDeployment(vercelProjectId, projectId);
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

  // Notify parent of URL changes
  useEffect(() => {
    onPreviewUrlChange?.(previewUrl);
  }, [previewUrl, onPreviewUrlChange]);

  // Check if deployment is ready for sharing
  const deploymentReady = branchDeployment?.state === 'READY' || status === 'deployed';

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

  const handleShareWithTeam = async (message: string) => {
    const pendingChanges = changes.filter(c => !c.approved_at);
    
    try {
      // Create a change request for team visibility
      const filePaths = pendingChanges.map(c => c.file_path).join(", ");
      await createChangeRequest({
        title: `Changes shared: ${pendingChanges.length} files`,
        description: `Files modified: ${filePaths}`,
        conversationId,
        deploymentId: deployment?.id
      });

      // Post the message to team comments
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: project } = await supabase
          .from('projects')
          .select('organization_id')
          .eq('id', projectId)
          .single();

        // Add team comment with the share message
        const fullMessage = `${message}${previewUrl ? `\n\n🔗 Preview: ${previewUrl}` : ''}`;
        
        await supabase.from('team_comments').insert({
          project_id: projectId,
          user_id: user.id,
          content: fullMessage,
          attachments: []
        });

        // Log activity
        if (project?.organization_id) {
          await supabase.from('activity_log').insert({
            organization_id: project.organization_id,
            project_id: projectId,
            user_id: user.id,
            action: 'changes_shared',
            metadata: {
              files_count: pendingChanges.length,
              file_paths: pendingChanges.map(c => c.file_path)
            }
          });
        }
      }

      toast.success("Changes shared with team");
    } catch (error) {
      console.error('Failed to share changes:', error);
      toast.error('Failed to share changes');
      throw error;
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
      <div className="flex h-full flex-col bg-background">
        {/* Header - unified h-12 */}
        <div className="flex h-12 items-center justify-between border-b border-border px-4 bg-muted/30">
          <div className="flex items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 h-12 text-sm transition-colors ${
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header - unified h-12 with tabs and contextual actions */}
      <div className="flex h-12 items-center justify-between border-b border-border px-4 bg-muted/30">
        <div className="flex items-center gap-4">
          {/* Tabs */}
          <div className="flex items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 h-12 text-sm transition-colors ${
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
          
          {/* Branch status - compact, in header */}
          {activeTab === "preview" && session?.current_branch && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{session.current_branch}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Preview-specific actions - only show when on preview tab */}
          {activeTab === "preview" && rawUrl && (
            <>
              <Button
                variant={visualEditMode ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={toggleVisualEditMode}
              >
                <MousePointer className="h-3 w-3" />
                <span className="hidden sm:inline">{visualEditMode ? "Exit" : "Edit"}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => triggerDeployment()}
                disabled={status === "building"}
              >
                <RefreshCw className={`h-3 w-3 ${status === "building" ? "animate-spin" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                asChild
              >
                <a href={rawUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </>
          )}
          <DeploymentStatus status={status} />
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0 overflow-auto bg-background">
        {activeTab === "preview" && (
          <div className="flex h-full flex-col animate-fade-in">
            {/* Preview iframe or states - no sub-header */}
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

      {/* Footer - unified p-3 bg-muted/30 */}
      <div className="flex items-center gap-2 border-t border-border p-3 bg-muted/30">
        <Button variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Undo
        </Button>
        
        {/* Share with Team button - enabled only when deployment is ready */}
        <Button 
          size="sm" 
          className="ml-auto gap-1.5"
          onClick={() => setShowShareDialog(true)}
          disabled={pendingChangesCount === 0 || !deploymentReady}
        >
          <Users className="h-3.5 w-3.5" />
          {!deploymentReady && pendingChangesCount > 0
            ? "Deploying..."
            : pendingChangesCount > 0 
              ? `Share ${pendingChangesCount} changes` 
              : "Share"
          }
        </Button>
      </div>

      {/* Share Dialog */}
      <ChangeShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        changes={changes.filter(c => !c.approved_at)}
        previewUrl={previewUrl}
        onShare={handleShareWithTeam}
      />
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
