'use client';

import { CircularCarousel, type CarouselItem } from '@/components/ui/circular-carousel';
import { CosmicBackground } from '@/components/ui/cosmic-background';
import { motion } from 'framer-motion';
import { Truck, Wrench, MapPin, Users, BarChart3, Shield } from 'lucide-react';

const demoItems: CarouselItem[] = [
  {
    id: 1,
    title: 'Fleet Tracking',
    description: 'Real-time GPS tracking for all your machines and equipment across job sites.',
    icon: <MapPin className="w-16 h-16" />,
  },
  {
    id: 2,
    title: 'Maintenance Scheduling',
    description: 'Automated maintenance reminders to keep your fleet running at peak performance.',
    icon: <Wrench className="w-16 h-16" />,
  },
  {
    id: 3,
    title: 'Operator Management',
    description: 'Track operator assignments, certifications, and performance metrics.',
    icon: <Users className="w-16 h-16" />,
  },
  {
    id: 4,
    title: 'Deployment Tracking',
    description: 'Monitor machine deployments across sites with real-time status updates.',
    icon: <Truck className="w-16 h-16" />,
  },
  {
    id: 5,
    title: 'Analytics Dashboard',
    description: 'Comprehensive insights into utilization, costs, and fleet performance.',
    icon: <BarChart3 className="w-16 h-16" />,
  },
  {
    id: 6,
    title: 'Safety & Compliance',
    description: 'Ensure compliance with safety regulations and track inspection history.',
    icon: <Shield className="w-16 h-16" />,
  },
];

export default function CircularCarouselDemo() {
  return (
    <CosmicBackground
      orbCount={5}
      showGrid={true}
      showStars={true}
      showGrain={true}
      hue={260}
      speed={0.8}
    >
      {/* Header */}
      <div className="container mx-auto px-4 pt-16 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Circular Carousel Demo
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            An animated orbital carousel that arcs cards along a curved track
            with smooth active-card transitions.
          </p>
        </motion.div>
      </div>

      {/* Carousel Section */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="container mx-auto px-4"
      >
        <div className="bg-zinc-900/30 rounded-3xl border border-zinc-700/30 p-8 md:p-12 backdrop-blur-sm">
          <CircularCarousel
            items={demoItems}
            autoPlay={true}
            autoPlayInterval={5000}
            visibleCount={5}
          />
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-semibold text-white mb-2">Features</h2>
          <p className="text-zinc-400">Built-in capabilities of the circular carousel</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Autoplay', desc: 'Automatically cycles through items with configurable interval' },
            { title: 'Keyboard Navigation', desc: 'Arrow keys to navigate between slides' },
            { title: 'Dot Indicators', desc: 'Visual indicators showing current position' },
            { title: 'Smooth Animations', desc: 'Framer Motion powered transitions' },
            { title: 'Responsive', desc: 'Adapts to different screen sizes' },
            { title: 'Accessible', desc: 'ARIA labels and keyboard support' },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              className="bg-zinc-800/30 rounded-xl p-6 border border-zinc-700/30 backdrop-blur-sm"
            >
              <h3 className="text-white font-medium mb-2">{feature.title}</h3>
              <p className="text-zinc-400 text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </CosmicBackground>
  );
}
