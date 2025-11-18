"use client";

import { CardSwiperSection } from "@/components/card-swiper/card-swiper-section";
import { PortoConnectButton } from "@/components/porto-connect-button";

export default function Home() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <PortoConnectButton size="default" />
        </section>

        <CardSwiperSection />
      </div>
    </div>
  );
}
