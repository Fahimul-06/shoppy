import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  Headphones,
  HelpCircle,
  Mail,
  MapPin,
  Newspaper,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';

const pageData = {
  'customer-care': {
    title: 'Customer Care',
    eyebrow: 'Support',
    description: 'Get help with orders, payments, returns, refunds, vouchers, seller products, and account issues.',
    icon: Headphones,
    actions: [
      { label: 'Open Live Chat', to: '/account' },
      { label: 'Track Order', to: '/order-tracking' },
    ],
    sections: [
      {
        title: 'How we can help',
        items: [
          'Order status, delivery updates, and product cancellation help.',
          'Return and refund support for eligible delivered products.',
          'Voucher, coupon, payment, and account troubleshooting.',
          'Customer-seller chat support and customer-care live chat.',
        ],
      },
      {
        title: 'Support hours',
        items: ['Every day from 9:00 AM to 9:00 PM.', 'For urgent order issues, use live chat from your account page.'],
      },
    ],
  },
  'help-center': {
    title: 'Help Center',
    eyebrow: 'Guides and FAQs',
    description: 'Find quick answers about shopping, checkout, delivery, returns, vouchers, and account settings.',
    icon: HelpCircle,
    actions: [
      { label: 'How to Buy', to: '/how-to-buy' },
      { label: 'Returns & Refunds', to: '/returns-refunds' },
    ],
    sections: [
      {
        title: 'Popular help topics',
        items: [
          'How to create an account and manage your profile.',
          'How to add products to cart and checkout selected items.',
          'How to apply vouchers and coupons during checkout.',
          'How to contact sellers after placing an order.',
        ],
      },
      {
        title: 'Self-service pages',
        items: ['Use My Orders for order progress.', 'Use Returns and Cancellations for after-order requests.', 'Use Wishlist and Coupons from your account sidebar.'],
      },
    ],
  },
  'how-to-buy': {
    title: 'How to Buy',
    eyebrow: 'Shopping guide',
    description: 'A simple step-by-step guide to place an order on Shoppy.',
    icon: ShoppingBag,
    actions: [
      { label: 'Start Shopping', to: '/' },
      { label: 'View Cart', to: '/cart' },
    ],
    sections: [
      {
        title: 'Steps to order',
        items: [
          'Search or browse products by category, sale section, or seller shop.',
          'Open the product page and choose colour/size if required.',
          'Add the product to cart or buy now.',
          'Select only the cart products you want to order.',
          'Choose delivery address, apply coupon if available, and confirm order.',
        ],
      },
      {
        title: 'After ordering',
        items: ['Track order status from My Orders.', 'Message the seller from the ordered product.', 'Review the product with photos after delivery.'],
      },
    ],
  },
  'returns-refunds': {
    title: 'Returns & Refunds',
    eyebrow: 'After-sales support',
    description: 'Learn how customers can request returns and follow refund progress.',
    icon: RefreshCw,
    actions: [
      { label: 'Request Return', to: '/returns' },
      { label: 'My Orders', to: '/orders' },
    ],
    sections: [
      {
        title: 'Return process',
        items: [
          'Returns can be requested for eligible delivered products.',
          'Choose the product, add reason/details, and submit a return request.',
          'Admin reviews the return and can approve or deny it.',
          'Sellers can see return requests for their own products.',
        ],
      },
      {
        title: 'Refund status',
        items: ['Refund timing depends on payment method and admin approval.', 'You can check return status from the Returns page.'],
      },
    ],
  },
  'contact-us': {
    title: 'Contact Us',
    eyebrow: 'Reach Shoppy',
    description: 'Contact Shoppy customer support for order, seller, payment, and account help.',
    icon: Mail,
    actions: [
      { label: 'Customer Care', to: '/customer-care' },
      { label: 'Help Center', to: '/help-center' },
    ],
    sections: [
      {
        title: 'Contact details',
        items: [
          'Email: support@shoppy.com',
          'Support time: 9:00 AM - 9:00 PM every day',
          'Address: Dhaka, Bangladesh',
        ],
      },
      {
        title: 'Fastest support',
        items: ['Login to your account and use Customer Care live chat.', 'For order issues, include your order number and product name.'],
      },
    ],
  },
  'order-tracking': {
    title: 'Order Tracking',
    eyebrow: 'Track delivery',
    description: 'Track order progress from placed to processing, shipped, delivered, reviewed, returned, or cancelled.',
    icon: Truck,
    actions: [
      { label: 'Go to My Orders', to: '/orders' },
      { label: 'Notifications', to: '/notifications' },
    ],
    sections: [
      {
        title: 'Order stages',
        items: [
          'To Pay: orders waiting for payment.',
          'To Ship: pending or processing products.',
          'To Receive: shipped or out-for-delivery products.',
          'To Review: delivered products ready for review.',
        ],
      },
      {
        title: 'Notifications',
        items: ['You will receive notifications when your order is processing, shipped, or delivered.'],
      },
    ],
  },
  'about-shoppy': {
    title: 'About Shoppy',
    eyebrow: 'Company',
    description: 'Shoppy is an online shopping platform built for customers, sellers, and admins with marketplace features.',
    icon: Building2,
    actions: [
      { label: 'Sell on Shoppy', to: '/sell-on-shoppy' },
      { label: 'Contact Us', to: '/contact-us' },
    ],
    sections: [
      {
        title: 'What Shoppy offers',
        items: [
          'Customer shopping with cart, wishlist, vouchers, reviews, and notifications.',
          'Seller dashboard for products, orders, returns, cancellations, and customer chat.',
          'Admin dashboard for products, sellers, orders, promos, banners, and customer care.',
        ],
      },
      {
        title: 'Our goal',
        items: ['Make online shopping easier, safer, and more useful for buyers and sellers.'],
      },
    ],
  },
  careers: {
    title: 'Careers',
    eyebrow: 'Join us',
    description: 'Explore opportunities to help build Shoppy and improve e-commerce experiences.',
    icon: Briefcase,
    actions: [
      { label: 'Contact HR', to: '/contact-us' },
      { label: 'About Shoppy', to: '/about-shoppy' },
    ],
    sections: [
      {
        title: 'Open areas',
        items: ['Customer support', 'Operations', 'Seller acquisition', 'Marketing', 'Software engineering', 'Delivery coordination'],
      },
      {
        title: 'Apply',
        items: ['Send your CV and preferred role to support@shoppy.com.'],
      },
    ],
  },
  'sell-on-shoppy': {
    title: 'Sell on Shoppy',
    eyebrow: 'Seller program',
    description: 'Start selling products on Shoppy with your own seller dashboard.',
    icon: Store,
    actions: [
      { label: 'Register as Seller', to: '/seller/register' },
      { label: 'Seller Login', to: '/seller/login' },
    ],
    sections: [
      {
        title: 'Seller features',
        items: [
          'Create and manage products with multiple photos, colours, and sizes.',
          'See product orders and chat with customers by ordered product.',
          'View returns and cancellations for your own products.',
          'Upload shop logo and manage shop/profile details.',
        ],
      },
      {
        title: 'Getting started',
        items: ['Register with shop details.', 'Wait for admin approval.', 'Add products and start selling.'],
      },
    ],
  },
  blog: {
    title: 'Blog',
    eyebrow: 'Stories and updates',
    description: 'Read shopping tips, seller guides, product trends, and Shoppy updates.',
    icon: Newspaper,
    actions: [
      { label: 'Shop Deals', to: '/' },
      { label: 'Coupons', to: '/coupons' },
    ],
    sections: [
      {
        title: 'Latest topics',
        items: ['How to choose the right product size.', 'How to use vouchers properly.', 'Tips for sellers to improve product photos.', 'How customer reviews help buyers.'],
      },
      {
        title: 'Coming soon',
        items: ['A full blog management system can be added later from admin dashboard.'],
      },
    ],
  },
  'press-room': {
    title: 'Press Room',
    eyebrow: 'Media',
    description: 'Find Shoppy company information, press contacts, announcements, and media resources.',
    icon: ShieldCheck,
    actions: [
      { label: 'Contact Press', to: '/contact-us' },
      { label: 'About Shoppy', to: '/about-shoppy' },
    ],
    sections: [
      {
        title: 'Press contact',
        items: ['Email: support@shoppy.com', 'Location: Dhaka, Bangladesh'],
      },
      {
        title: 'Media information',
        items: ['Shoppy connects customers, sellers, and marketplace management in one platform.'],
      },
    ],
  },
};

type PageKey = keyof typeof pageData;

const iconMap = [CheckCircle, PackageCheck, Search, Phone, MapPin];

export default function StaticInfoPage() {
  const { slug } = useParams<{ slug: string }>();
  const key = (slug || 'help-center') as PageKey;
  const page = pageData[key] || pageData['help-center'];
  const Icon = page.icon;

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Icon size={30} />
            </div>
            <div>
              <p className="text-orange-100 font-semibold text-sm uppercase tracking-wide">{page.eyebrow}</p>
              <h1 className="text-3xl lg:text-5xl font-extrabold mt-2">{page.title}</h1>
              <p className="text-orange-50 max-w-3xl mt-4 text-base lg:text-lg leading-relaxed">{page.description}</p>
              <div className="flex flex-wrap gap-3 mt-6">
                {page.actions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="inline-flex items-center gap-2 bg-white text-orange-600 px-5 py-2.5 rounded-xl font-bold hover:bg-orange-50 transition-colors"
                  >
                    {action.label}
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {page.sections.map((section, sectionIndex) => (
              <div key={section.title} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                <div className="space-y-3">
                  {section.items.map((item, itemIndex) => {
                    const BulletIcon = iconMap[(sectionIndex + itemIndex) % iconMap.length];
                    return (
                      <div key={item} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                          <BulletIcon size={16} />
                        </div>
                        <p className="text-gray-700 leading-relaxed pt-1">{item}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <aside className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
            <h3 className="font-bold text-gray-900 mb-4">Quick links</h3>
            <div className="space-y-2">
              {Object.entries(pageData).map(([linkKey, value]) => (
                <Link
                  key={linkKey}
                  to={`/${linkKey}`}
                  className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    linkKey === key ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                  }`}
                >
                  {value.title}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
