
'use client';

import type { NextPage } from 'next';
import Image from 'next/image';
import { NetworkCanvas } from '@/components/network-canvas';
import { Sidebar } from '@/components/sidebar';
import { PerformanceMetrics } from '@/components/performance-metrics';
import { NetworkProvider } from '@/context/network-context';
import { TypingGlitchTagline } from '@/components/typing-glitch-tagline';
import { ClientOnly } from '@/components/client-only';

const Home: NextPage = () => {
  const titleText = "Optimizing Data Flow in IoT Sensor Networks Using Graph Theory";
  const taglineText = "Structuring the Invisible.";
  const headerBackgroundImageUrl = 'https://t4.ftcdn.net/jpg/04/33/61/77/360_F_433617782_NQqvkrU35Y6ZIuzwMadUGUx3Ag5ZfDHs.jpg';

  return (
    <NetworkProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        {/* Header Area - Now using body background, covered by its own image */}
        <header
          className="p-4 border-b border-border/50 text-center shadow-lg bg-card/80 backdrop-blur-sm relative bg-cover bg-center"
          style={{ backgroundImage: `url('${headerBackgroundImageUrl}')` }}
        >
          {/* Overlay to improve text readability if needed */}
          <div className="absolute inset-0 bg-black/30 z-0"></div> {/* Optional: Dark overlay */}
          
          {/* Logo - ensure z-index is higher than overlay */}
          <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20">
            <Image
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyawIRbc2YMupSsJT8UqUJmMJD4M4kWJ5CGg&s"
              alt="RV College Logo"
              width={70}
              height={70}
              className="rounded-full"
              priority
            />
          </div>

          {/* Content container to be above overlay */}
          <div className="relative z-10">
            <TypingGlitchTagline
              text={titleText}
              className="text-xl md:text-2xl font-bold text-glow-primary block"
              typingEnabled={false}
              glitchEnabled={true}
              typingSpeed={50}
              glitchIntervalMin={500}
              glitchIntervalMax={1500}
              glitchDuration={350}
            />
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Collaboratively engineered by Vishwa Panchal – 1RV24IS413 & Yashvanth M U – 1RV23IS141
            </p>
            <p className="text-sm md:text-md font-semibold text-glow-accent mt-2 min-h-[1.5em] md:min-h-[1.25em] underline-animate">
              {taglineText}
            </p>
          </div>
        </header>

        {/* Main Content Area - This will now allow body background to show through */}
        <div className="flex flex-1 overflow-hidden"> {/* Main content area with semi-transparent theme background and blur */}
          <ClientOnly fallback={<div className="w-80 h-full border-r border-border bg-card" />}>
            <Sidebar />
          </ClientOnly>
          <ClientOnly fallback={<div className="flex-1 bg-background" />}>
            <div className="flex flex-1 flex-col overflow-hidden"> {/* This column contains Canvas and Metrics */}
              <NetworkCanvas />
              <PerformanceMetrics />
            </div>
          </ClientOnly>
        </div>
      </div>
    </NetworkProvider>
  );
};

export default Home;
