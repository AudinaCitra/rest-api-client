import type {
  ApiRequest,
  ApiResponse,
  Collection,
  Environment,
  HistoryEntry,
  IpcResult,
} from '../main/models/types';

export {};

declare global {
  interface Window {
    api: {
      send(request: ApiRequest): Promise<IpcResult<ApiResponse>>;

      collections: {
        list(): Promise<IpcResult<Collection[]>>;
        create(name: string): Promise<IpcResult<Collection>>;
        rename(id: number, name: string): Promise<IpcResult<Collection | null>>;
        delete(id: number): Promise<IpcResult<boolean>>;
        exportJson(id: number): Promise<IpcResult<boolean>>;
        importJson(): Promise<IpcResult<Collection | null>>;
      };

      requests: {
        listByCollection(collectionId: number): Promise<IpcResult<ApiRequest[]>>;
        save(request: ApiRequest): Promise<IpcResult<ApiRequest>>;
        delete(id: number): Promise<IpcResult<boolean>>;
      };

      environments: {
        list(): Promise<IpcResult<Environment[]>>;
        save(environment: Environment): Promise<IpcResult<Environment>>;
        delete(id: number): Promise<IpcResult<boolean>>;
        setActive(id: number): Promise<IpcResult<boolean>>;
      };

      history: {
        list(): Promise<IpcResult<HistoryEntry[]>>;
        clear(): Promise<IpcResult<boolean>>;
      };
    };
  }
}