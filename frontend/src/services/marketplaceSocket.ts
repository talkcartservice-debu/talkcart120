import socketService from './socketService';
import { TrendingHashtag } from './postsApi';

type TrendingUpdateCallback = (topics: TrendingHashtag[]) => void;

class MarketplaceSocketService {
  private trendingUpdateCallbacks: TrendingUpdateCallback[] = [];

  constructor() {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    socketService.on('trending:update', (data: TrendingHashtag[]) => {
      this.notifyTrendingUpdate(data);
    });
  }

  public onTrendingUpdate(callback: TrendingUpdateCallback): () => void {
    this.trendingUpdateCallbacks.push(callback);
    return () => {
      this.trendingUpdateCallbacks = this.trendingUpdateCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyTrendingUpdate(topics: TrendingHashtag[]): void {
    this.trendingUpdateCallbacks.forEach(callback => callback(topics));
  }
}

const marketplaceSocket = new MarketplaceSocketService();
export default marketplaceSocket;