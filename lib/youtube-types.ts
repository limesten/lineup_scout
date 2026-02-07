export interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default: { url: string; width: number; height: number };
      medium: { url: string; width: number; height: number };
      high: { url: string; width: number; height: number };
    };
    publishedAt: string;
  };
}

export interface YouTubeSearchResponse {
  items: YouTubeSearchResult[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}
