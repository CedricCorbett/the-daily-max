import ColdOpen from '@/components/chapters/ColdOpen';
import TheBody from '@/components/chapters/TheBody';
import TheBar from '@/components/chapters/TheBar';
import HazardWipe from '@/components/chapters/HazardWipe';
import TheCrew from '@/components/chapters/TheCrew';
import TheRally from '@/components/chapters/TheRally';
import TypeMotion from '@/components/chapters/TypeMotion';
import TheVerdict from '@/components/chapters/TheVerdict';
import HazardStripe from '@/components/ui/HazardStripe';
import MuteToggle from '@/components/ui/MuteToggle';

export default function Page() {
  return (
    <main className="relative">
      <MuteToggle />
      <HazardStripe />
      <ColdOpen />
      <TheBody />
      <TheBar />
      <HazardWipe />
      <TheCrew />
      <TheRally />
      <TypeMotion />
      <TheVerdict />
      <HazardStripe />
      <footer className="py-10 text-center">
        <div className="mono-label text-ash">
          THE DAILY MAX · SIX MINUTES · FOUR STATIONS · EVERY DAY
        </div>
      </footer>
    </main>
  );
}
