import React from 'react';
import HeroBanner from '../components/HeroBanner';
import DailySalesBox from '../components/DailySalesBox';
import FeatureBadges from '../components/FeatureBadges';
import FlashSaleSection from '../components/FlashSaleSection';
import Categories from '../components/Categories';
import ProductDeals from '../components/ProductDeals';

export default function HomePage() {
  return (
    <>
      <DailySalesBox />
      <HeroBanner />
      <FeatureBadges />
      <FlashSaleSection />
      <Categories />
      <ProductDeals />
    </>
  );
}
