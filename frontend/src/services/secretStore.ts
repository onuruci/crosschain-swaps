// In-memory secret store for atomic swaps
class SecretStore {
  private secrets: Map<string, string> = new Map();

  /**
   * Store a secret for a hashlock
   */
  storeSecret(hashlock: string, secret: string): void {
    this.secrets.set(hashlock, secret);
    console.log('🔐 Secret stored in memory for hashlock:', hashlock.substring(0, 16) + '...');
  }

  /**
   * Retrieve a secret for a hashlock
   */
  getSecret(hashlock: string): string | undefined {
    return this.secrets.get(hashlock);
  }

  /**
   * Remove a secret after use
   */
  removeSecret(hashlock: string): void {
    this.secrets.delete(hashlock);
    console.log('🗑️ Secret removed from memory for hashlock:', hashlock.substring(0, 16) + '...');
  }

  /**
   * Check if a secret exists for a hashlock
   */
  hasSecret(hashlock: string): boolean {
    return this.secrets.has(hashlock);
  }

  /**
   * Get all stored hashlocks
   */
  getStoredHashlocks(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Clear all secrets (useful for testing or logout)
   */
  clearAllSecrets(): void {
    const count = this.secrets.size;
    this.secrets.clear();
    console.log(`🧹 Cleared ${count} secrets from memory`);
  }

  /**
   * Get the number of stored secrets
   */
  getSecretCount(): number {
    return this.secrets.size;
  }
}

// Export a singleton instance
export const secretStore = new SecretStore();
export default SecretStore; 