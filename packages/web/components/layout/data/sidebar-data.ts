import {
  BarChart3,
  Building2,
  CircleDollarSign,
  LayoutDashboard,
  LifeBuoy,
  MapPin,
  Receipt,
  Rocket,
  Scale,
  ScrollText,
  Settings,
  Tractor,
  Truck,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Fleet OS',
    email: 'owner@fleetos.dev',
    avatar: '/favicon.svg',
  },
  teams: [
    {
      name: 'Fleet OS',
      logo: Truck,
      plan: 'Heavy Equipment',
    },
  ],
  navGroups: [
    {
      title: 'Overview',
      items: [
        {
          title: 'Dashboard',
          url: '/home',
          icon: LayoutDashboard,
        },
        {
          title: 'Insights',
          url: '/insights',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'Fleet',
      items: [
        {
          title: 'Machines',
          url: '/machines',
          icon: Tractor,
        },
        {
          title: 'Sites',
          url: '/sites',
          icon: MapPin,
        },
        {
          title: 'Deployments',
          url: '/deployments',
          icon: Rocket,
        },
        {
          title: 'Operators',
          url: '/operators',
          icon: Users,
        },
        {
          title: 'Clients',
          url: '/clients',
          icon: Building2,
        },
      ],
    },
    {
      title: 'Finance',
      items: [
        {
          title: 'Billing',
          url: '/billing',
          icon: Receipt,
        },
        {
          title: 'Cash',
          url: '/cash',
          icon: CircleDollarSign,
        },
        {
          title: 'Projections',
          url: '/projections',
          icon: Scale,
        },
      ],
    },
    {
      title: 'Admin',
      items: [
        {
          title: 'Audit',
          url: '/audit',
          icon: ScrollText,
        },
        {
          title: 'Support',
          url: '/support',
          icon: LifeBuoy,
        },
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
