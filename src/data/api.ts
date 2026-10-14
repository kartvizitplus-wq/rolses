import type {
  Application,
  ApplicationStatus,
  LocalMedia,
  Message,
  NewTaskInput,
  Order,
  Profile,
  Review,
  Task,
  TaskFilter,
} from '../types';

export interface ApplyInput {
  media?: LocalMedia | null;
  link?: string;
  note?: string;
}

export interface PayResult {
  /** iyzico ödeme sayfası adresi; varsa kullanıcı oraya yönlendirilir. */
  paymentPageUrl?: string;
  /** Ödeme anında tamamlandıysa (demo / test modu) true. */
  funded: boolean;
}

export interface DemoUser {
  id: string;
  display_name: string;
  role_hint: string;
}

export interface Api {
  mode: 'demo' | 'live';

  // Oturum
  currentUserId(): Promise<string | null>;
  onAuthChange(cb: (userId: string | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  demoUsers(): DemoUser[];
  switchDemoUser(id: string): Promise<void>;

  // Profil
  getProfile(id: string): Promise<Profile | null>;
  updateMyProfile(patch: Partial<Profile>, demo?: LocalMedia | null): Promise<void>;
  listReviewsFor(userId: string): Promise<Review[]>;

  // Görevler
  listTasks(filter: TaskFilter): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(input: NewTaskInput): Promise<string>;
  cancelTask(id: string): Promise<void>;
  listMyTasks(): Promise<Task[]>;

  // Başvurular
  apply(roleId: string, input: ApplyInput): Promise<void>;
  listApplicationsForTask(taskId: string): Promise<Application[]>;
  listMyApplications(): Promise<(Application & { task_title: string; role_name: string })[]>;
  setApplicationStatus(id: string, status: Exclude<ApplicationStatus, 'selected'>): Promise<void>;
  /** Başvuruyu seçer, rolü kapatır ve ödeme bekleyen bir iş (order) açar. */
  selectApplication(id: string): Promise<string>;

  // İşler (siparişler)
  listMyOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  payOrder(id: string): Promise<PayResult>;
  deliverOrder(id: string, media: LocalMedia, note: string): Promise<void>;
  requestRevision(id: string, note: string): Promise<void>;
  approveOrder(id: string): Promise<void>;

  // Mesaj ve puan
  listMessages(orderId: string): Promise<Message[]>;
  sendMessage(orderId: string, body: string): Promise<void>;
  addReview(orderId: string, stars: number, comment: string): Promise<void>;
  hasReviewed(orderId: string): Promise<boolean>;

  // Medya ve güvenlik
  mediaUrl(path: string): Promise<string>;
  report(targetType: 'task' | 'user' | 'application', targetId: string, reason: string): Promise<void>;
}
