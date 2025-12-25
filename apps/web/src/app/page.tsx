"use client";

import { CardSwiperSection } from "@/components/card-swiper/card-swiper-section";

export default function Home() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <CardSwiperSection />
      </div>
    </div>
  );
}
