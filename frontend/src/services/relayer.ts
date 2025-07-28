import axios from 'axios';
import { SwapStatus, RelayerStatus } from '../types';
import { config } from '../config';

const RELAYER_BASE_URL = config.relayer.url;

class RelayerService {
  private baseURL: string;

  constructor(baseURL: string = RELAYER_BASE_URL) {
    this.baseURL = baseURL;
  }

  async getHealth() {
    const response = await axios.get(`${this.baseURL}/health`);
    return response.data;
  }

  async getStatus(): Promise<RelayerStatus> {
    const response = await axios.get(`${this.baseURL}/status`);
    return response.data;
  }

  async getPendingSwaps(): Promise<SwapStatus[]> {
    const response = await axios.get(`${this.baseURL}/swaps/pending`);
    return response.data.swaps;
  }

  async getCompletedSwaps(): Promise<SwapStatus[]> {
    const response = await axios.get(`${this.baseURL}/swaps/completed`);
    return response.data.swaps;
  }

  async getSwapStatus(hashlock: string): Promise<SwapStatus> {
    const response = await axios.get(`${this.baseURL}/swaps/${hashlock}`);
    return response.data;
  }

  async completeSwap(hashlock: string, secret: string, chain: 'ethereum' | 'aptos') {
    const response = await axios.post(`${this.baseURL}/swaps/${hashlock}/complete`, {
      secret,
      chain
    });
    return response.data;
  }

  async refundSwap(hashlock: string, chain: 'ethereum' | 'aptos') {
    const response = await axios.post(`${this.baseURL}/swaps/${hashlock}/refund`, {
      chain
    });
    return response.data;
  }
}

export const relayerService = new RelayerService();
export default RelayerService; 