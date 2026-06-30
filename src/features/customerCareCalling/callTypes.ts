export type Role = 'delivery' | 'admin';

export type Signal = {
  id?: string;
  from: Role;
  to?: Role;
  type: 'offer' | 'answer' | 'candidate' | 'leave';
  payload: any;
};
