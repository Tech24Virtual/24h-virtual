import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ScriptIssue,
  ValidationReport,
} from "@/lib/scriptBuilder/validateScriptTree";

interface Props {
  report: ValidationReport;
  onJumpToNode?: (nodeId: string) => void;
}

export function ValidationBadge({ report, onJumpToNode }: Props) {
  const { errorCount, warningCount, infoCount, issues } = report;
  const total = errorCount + warningCount + infoCount;

  const variant = errorCount > 0 ? "destructive" : warningCount > 0 ? "warning" : "ok";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={cn(
            "gap-1.5 px-2 text-xs",
            variant === "destructive" && "text-destructive hover:text-destructive",
            variant === "warning" && "text-status-warning hover:text-status-warning",
            variant === "ok" && "text-status-success hover:text-status-success",
          )}
        >
          {variant === "destructive" ? (
            <AlertCircle className="h-3.5 w-3.5" />
          ) : variant === "warning" ? (
            <AlertTriangle className="h-3.5 w-3.5" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          {total === 0 ? (
            <span>Valid</span>
          ) : (
            <span>
              {errorCount > 0 && <strong>{errorCount} error{errorCount !== 1 && "s"}</strong>}
              {errorCount > 0 && (warningCount > 0 || infoCount > 0) && " · "}
              {warningCount > 0 && (
                <span>{warningCount} warning{warningCount !== 1 && "s"}</span>
              )}
              {warningCount > 0 && infoCount > 0 && " · "}
              {infoCount > 0 && <span>{infoCount} info</span>}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h4 className="text-sm font-semibold">Script validation</h4>
            <p className="text-[11px] text-muted-foreground">
              Errors must be resolved before publishing.
            </p>
          </div>
          <ValidationSummary report={report} />
        </div>
        {issues.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-status-success" />
            <p className="text-sm font-medium">No issues found</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              The script tree passes all checks.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y">
              {issues.map((issue, idx) => (
                <IssueRow
                  key={idx}
                  issue={issue}
                  onJumpToNode={onJumpToNode}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ValidationSummary({ report }: { report: ValidationReport }) {
  const { errorCount, warningCount, infoCount } = report;
  if (errorCount + warningCount + infoCount === 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-status-success/30 text-status-success"
      >
        <CheckCircle2 className="h-3 w-3" /> Clean
      </Badge>
    );
  }
  return (
    <div className="flex items-center gap-1">
      {errorCount > 0 && (
        <Badge variant="destructive" className="text-[10px]">
          {errorCount}E
        </Badge>
      )}
      {warningCount > 0 && (
        <Badge
          variant="outline"
          className="border-status-warning/40 text-[10px] text-status-warning"
        >
          {warningCount}W
        </Badge>
      )}
      {infoCount > 0 && (
        <Badge variant="outline" className="text-[10px]">
          {infoCount}i
        </Badge>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  onJumpToNode,
}: {
  issue: ScriptIssue;
  onJumpToNode?: (nodeId: string) => void;
}) {
  const Icon =
    issue.severity === "error"
      ? AlertCircle
      : issue.severity === "warning"
        ? AlertTriangle
        : Info;
  const color =
    issue.severity === "error"
      ? "text-destructive"
      : issue.severity === "warning"
        ? "text-status-warning"
        : "text-muted-foreground";
  const firstNodeId = issue.nodeIds?.[0];

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start gap-2">
        <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", color)} />
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-snug">{issue.message}</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="text-[10px] text-muted-foreground">{issue.code}</code>
            {firstNodeId && onJumpToNode && (
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0 text-[11px]"
                onClick={() => onJumpToNode(firstNodeId)}
              >
                Jump to node
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
