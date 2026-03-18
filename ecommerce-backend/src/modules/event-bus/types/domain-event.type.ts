export interface DomainEvent<T = any> {
  event: string;
  storeId: number;
  payload: T;
  createdAt: Date;
}
