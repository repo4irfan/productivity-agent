export type ApprovalRequest = {
  tool: string;
  args: Record<string, unknown>;
  description: string;
};

export type ApprovalHandler = (request: ApprovalRequest) => Promise<boolean>;

export const autoApprove: ApprovalHandler = async () => true;
export const autoDeny: ApprovalHandler = async () => false;