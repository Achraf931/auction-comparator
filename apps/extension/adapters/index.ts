import type { SiteAdapter, AdapterRegistry, AdapterConstructor } from '@auction-comparator/shared'
import { InterencheresAdapter } from './interencheres'
import { AlcopaAdapter } from './alcopa'
import { EncheresDomaineAdapter } from './encheres-domaine'
import { GenericAdapter } from './generic'

class AdapterRegistryImpl implements AdapterRegistry {

  private adapters: Map<string, AdapterConstructor> = new Map()
  private instances: Map<string, SiteAdapter> = new Map()

  constructor() {
    // Register built-in adapters
    this.register(InterencheresAdapter)
    this.register(AlcopaAdapter)
    this.register(EncheresDomaineAdapter)
    this.register(GenericAdapter)
  }

  register(adapter: AdapterConstructor): void {
    const instance = new adapter()
    this.adapters.set(instance.id, adapter)
    this.instances.set(instance.id, instance)
  }

  getAdapter(url: string): SiteAdapter | null {
    // Try specific adapters first (skip generic)
    for (const [id, adapter] of this.instances) {
      if (id === 'generic') continue

      for (const pattern of adapter.urlPatterns) {
        if (pattern.test(url)) {
          return adapter
        }
      }
    }

    // Fall back to generic adapter
    return this.instances.get('generic') || null
  }

  getAdapterIds(): string[] {
    return Array.from(this.adapters.keys())
  }

}

// Singleton instance
let registry: AdapterRegistry | null = null

export function getAdapterRegistry(): AdapterRegistry {
  if (!registry) {
    registry = new AdapterRegistryImpl()
  }
  return registry
}

export function getAdapterForCurrentPage(): SiteAdapter | null {
  return getAdapterRegistry().getAdapter(window.location.href)
}

export { InterencheresAdapter, AlcopaAdapter, EncheresDomaineAdapter, GenericAdapter }
