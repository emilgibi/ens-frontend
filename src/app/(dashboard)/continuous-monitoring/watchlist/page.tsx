import { vendors } from '@/data/ccm-dummy/vendors';
import VendorTable from '@/components/continuous-monitoring/vendor-table';
import { Separator } from '@/components/ui/separator';

export default function WatchlistPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold mb-1">Vendor Watchlist</h1>
        <p className="text-muted-foreground">
          All entities enrolled in continuous monitoring. Click a vendor to see its risk timeline.
        </p>
      </div>
      <Separator className="my-1" />
      <VendorTable vendors={vendors} />
    </div>
  );
}
