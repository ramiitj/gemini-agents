const mockDiff = `@@ -1,5 +1,25 @@
 import Hero from "@/components/Hero";
+import Testimonials from "@/components/Testimonials";
 
 export default function Home() {
   return (
     <main>
       <Hero />
+      <Testimonials />
     </main>
   );
 }`;

const DiffViewer = () => {
  const lines = mockDiff.split("\n");

  return (
    <div className="overflow-hidden rounded border border-border">
      <div className="border-b border-border bg-muted/50 px-3 py-2">
        <span className="text-xs font-medium text-foreground">
          src/pages/index.tsx
        </span>
      </div>
      <pre className="overflow-x-auto text-xs">
        {lines.map((line, i) => {
          let bgColor = "";
          let textColor = "text-foreground";
          
          if (line.startsWith("+") && !line.startsWith("+++")) {
            bgColor = "bg-green-500/10";
            textColor = "text-green-700 dark:text-green-400";
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            bgColor = "bg-red-500/10";
            textColor = "text-red-700 dark:text-red-400";
          } else if (line.startsWith("@@")) {
            textColor = "text-muted-foreground";
          }

          return (
            <div
              key={i}
              className={`px-3 py-0.5 font-mono ${bgColor} ${textColor}`}
            >
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
};

export default DiffViewer;
