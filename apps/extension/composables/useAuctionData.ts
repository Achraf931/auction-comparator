import { ref, readonly } from 'vue'
import type { AuctionData } from '@auction-comparator/shared'

const auctionData = ref<AuctionData | null>(null)

export function useAuctionData() {
  function setAuctionData(data: AuctionData) {
    auctionData.value = data
  }

  function clearAuctionData() {
    auctionData.value = null
  }

  return {
    auctionData: readonly(auctionData),
    setAuctionData,
    clearAuctionData,
  }
}
