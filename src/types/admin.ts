import type { ObjectId } from "mongodb";
import type {
  AssessmentSections,
  AssessmentStatus,
  AssessmentStepNumber,
} from "@/types/assessment";

export type AdminRole = "admin";

export type AdminDocument = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: AdminRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminSessionDocument = {
  _id: ObjectId;
  adminId: ObjectId;
  sessionTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  invalidatedAt?: Date;
};

export type AdminSessionUser = {
  id: string;
  email: string;
  role: AdminRole;
};

export type AdminSession = {
  admin: AdminSessionUser;
  expiresAt: string;
};

export type AdminAssessmentListItem = {
  id: string;
  status: AssessmentStatus;
  lastCompletedStep: number;
  customerName: string;
  customerEmail: string;
  vehicle: string;
  vehicleManufacturer: string;
  vehicleModel: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  completedAt?: string;
};

export type AdminAssessmentDetail = {
  id: string;
  status: AssessmentStatus;
  currentStep: AssessmentStepNumber;
  lastCompletedStep: number;
  sections: AssessmentSections;
  adminNotes: string;
  missingSections: string[];
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  completedAt?: string;
};

export type AssessmentDropOffStat = {
  step: number;
  label: string;
  count: number;
};

export type AdminDashboardStats = {
  totalAssessments: number;
  completedAssessments: number;
  draftAssessments: number;
  completionPercentage: number;
  inactiveDraftAssessments: number;
  inactiveDraftThresholdDays: number;
  dropOffs: AssessmentDropOffStat[];
  recentlySubmittedAssessments: AdminAssessmentListItem[];
};
