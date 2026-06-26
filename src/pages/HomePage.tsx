import React from 'react';
import HeroBanner from '../components/HeroBanner';
import FeatureBadges from '../components/FeatureBadges';
import FlashSaleSection from '../components/FlashSaleSection';
import Categories from '../components/Categories';
import ProductDeals from '../components/ProductDeals';

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <FeatureBadges />
      <FlashSaleSection />
      <Categories />
      <ProductDeals />
    </>
  );
}
