export type TaskType = 'voice' | 'script';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type RoleStatus = 'open' | 'cast' | 'delivered' | 'approved';
export type ApplicationStatus = 'pending' | 'shortlisted' | 'selected' | 'rejected';
export type OrderStatus =
  | 'awaiting_payment'
  | 'funded'
  | 'delivered'
  | 'revision'
  | 'approved'
  | 'cancelled';

export interface Profile {
  id: string;
  display_name: string;
  bio: string;
  city: string;
  gender: '' | 'kadın' | 'erkek';
  voice_tags: string[];
  demo_path: string | null;
  is_talent: boolean;
  rating_avg: number;
  rating_count: number;
  completed_count: number;
  created_at: string;
}

export interface Line {
  text: string;
  emotion: string;
}

export interface Role {
  id: string;
  task_id: string;
  name: string;
  description: string;
  gender_pref: '' | 'kadın' | 'erkek';
  budget: number;
  lines: Line[];
  status: RoleStatus;
  talent_id: string | null;
  application_count: number;
}

export interface Task {
  id: string;
  owner_id: string;
  type: TaskType;
  title: string;
  description: string;
  video_url: string;
  language: string;
  deadline: string | null;
  mature: boolean;
  status: TaskStatus;
  created_at: string;
  roles: Role[];
  owner?: Pick<Profile, 'id' | 'display_name' | 'rating_avg' | 'rating_count'>;
}

export interface Application {
  id: string;
  role_id: string;
  task_id: string;
  talent_id: string;
  media_path: string | null;
  media_kind: 'audio' | 'video' | 'link';
  link: string;
  note: string;
  status: ApplicationStatus;
  created_at: string;
  talent?: Pick<Profile, 'id' | 'display_name' | 'rating_avg' | 'rating_count' | 'voice_tags'>;
}

export interface Order {
  id: string;
  role_id: string;
  task_id: string;
  owner_id: string;
  talent_id: string;
  amount: number;
  owner_fee: number;
  talent_commission: number;
  status: OrderStatus;
  payment_ref: string | null;
  delivery_path: string | null;
  delivery_note: string;
  revision_count: number;
  delivered_at: string | null;
  approved_at: string | null;
  created_at: string;
  role?: Pick<Role, 'id' | 'name' | 'lines'>;
  task?: Pick<Task, 'id' | 'title' | 'type'>;
  owner?: Pick<Profile, 'id' | 'display_name'>;
  talent?: Pick<Profile, 'id' | 'display_name'>;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  from_id: string;
  to_id: string;
  stars: number;
  comment: string;
  created_at: string;
}

export interface NewRoleInput {
  name: string;
  description: string;
  gender_pref: '' | 'kadın' | 'erkek';
  budget: number;
  lines: Line[];
}

export interface NewTaskInput {
  type: TaskType;
  title: string;
  description: string;
  video_url: string;
  language: string;
  deadline: string | null;
  mature: boolean;
  roles: NewRoleInput[];
}

export interface TaskFilter {
  type?: TaskType | 'all';
  search?: string;
  gender?: '' | 'kadın' | 'erkek';
  minBudget?: number;
}

/** Yerelde kaydedilen ya da seçilen bir medya dosyası. */
export interface LocalMedia {
  uri: string;
  name: string;
  mimeType: string;
}
