'use client';

import { BarChart } from '@/components/ui/bar-chart';
import { CosmicBackground } from '@/components/ui/cosmic-background';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react';

const revenueData = [
  { label: 'Jan', value: 4200, color: '#6366f1' },
  { label: 'Feb', value: 3800, color: '#8b5cf6' },
  { label: 'Mar', value: 5100, color: '#a78bfa' },
  { label: 'Apr', value: 4700, color: '#6366f1' },
  { label: 'May', value: 6200, color: '#8b5cf6' },
  { label: 'Jun', value: 5800, color: '#a78bfa' },
];

const machineHoursData = [
  { label: 'CAT 320', value: 186, color: '#10b981' },
  { label: 'Komatsu', value: 164, color: '#6366f1' },
  { label: 'Hitachi', value: 142, color: '#f59e0b' },
  { label: 'Volvo', value: 128, color: '#ec4899' },
  { label: 'Deere', value: 98, color: '#14b8a6' },
];

const utilizationData = [
  { label: 'Site A', value: 87, color: '#10b981' },
  { label: 'Site B', value: 72, color: '#6366f1' },
  { label: 'Site C', value: 65, color: '#f59e0b' },
  { label: 'Site D', value: 91, color: '#10b981' },
  { label: 'Site E', value: 45, color: '#ef4444' },
];

const costData = [
  { label: 'Fuel', value: 12400, color: '#f59e0b' },
  { label: 'Maint.', value: 8200, color: '#6366f1' },
  { label: 'Insurance', value: 5600, color: '#10b981' },
  { label: 'Repairs', value: 4300, color: '#ef4444' },
  { label: 'Parts', value: 3800, color: '#8b5cf6' },
];

export default function BarChartDemo() {
  return (
    <CosmicBackground hue={260} orbCount={3} showStars={false} showGrain>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Visx Bar Charts
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            High-performance data visualization powered by @visx with animated bar entrances.
          </p>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
                  <DollarSign className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Monthly Revenue</h3>
                  <p className="text-sm text-zinc-400">Revenue trend over the last 6 months</p>
                </div>
              </div>
              <BarChart
                data={revenueData}
                height={320}
                layout="vertical"
                valuePrefix="$"
                showGrid
                showLabels
                showValues
              />
            </div>
          </motion.div>

          {/* Machine Hours Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20">
                  <Clock className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Hours per Machine</h3>
                  <p className="text-sm text-zinc-400">Operating hours by machine this month</p>
                </div>
              </div>
              <BarChart
                data={machineHoursData}
                height={320}
                layout="vertical"
                valueSuffix="h"
                showGrid
                showLabels
                showValues
              />
            </div>
          </motion.div>

          {/* Utilization Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20">
                  <TrendingUp className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Site Utilization</h3>
                  <p className="text-sm text-zinc-400">Equipment utilization rate by site</p>
                </div>
              </div>
              <BarChart
                data={utilizationData}
                height={320}
                layout="horizontal"
                valueSuffix="%"
                showGrid
                showLabels
                showValues
              />
            </div>
          </motion.div>

          {/* Cost Breakdown Chart */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
                  <BarChart3 className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Cost Breakdown</h3>
                  <p className="text-sm text-zinc-400">Operating expenses by category</p>
                </div>
              </div>
              <BarChart
                data={costData}
                height={320}
                layout="vertical"
                valuePrefix="$"
                showGrid
                showLabels
                showValues
              />
            </div>
          </motion.div>
        </div>
      </div>
    </CosmicBackground>
  );
}
