export type CascadeImpactAction = 'delete' | 'keep' | 'clear' | 'block';

export type CascadeImpactItem = {
  key: string;
  label: string;
  count: number;
  action: CascadeImpactAction;
};

export type EmployeeCascadePreview = {
  employeeDocId: string;
  name: string;
  employeeId: string;
  email: string;
  items: CascadeImpactItem[];
  totalDeletedDocs: number;
};

export type LocationCascadePreview = {
  locationId: string;
  name: string;
  items: CascadeImpactItem[];
  blocked: boolean;
  blockReason?: string;
};
