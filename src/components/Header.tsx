import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, User, Menu, X, ChevronDown, ChevronRight,
  Grid3X3, Zap, Sparkles, Tag, Award, Store,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { categories } from '../data/categories';
import { products } from '../data/products';

// ── Sub-sub-category data ─────────────────────────────────────────────────────
const subSubMap: Record<string, Record<string, string[]>> = {
  'mens-fashion': {
    'T-Shirts':          ['Solid T-Shirts', 'Printed', 'Striped', 'V-Neck', 'Oversized', 'Graphic Tees', 'Full Sleeve', 'Half Sleeve'],
    'Formal Shirts':     ['Solid Shirts', 'Striped', 'Checked', 'Slim Fit', 'Regular Fit', 'Wedding Shirts', 'Oxford', 'Linen'],
    'Jeans & Trousers':  ['Slim Fit Jeans', 'Regular Fit', 'Skinny Jeans', 'Stretch Jeans', 'Chinos', 'Formal Trousers', 'Cargo', 'Joggers'],
    'Jackets & Coats':   ['Leather Jackets', 'Denim Jackets', 'Blazers', 'Puffer', 'Raincoat', 'Windbreaker', 'Bomber', 'Overcoat'],
    'Polo Shirts':       ['Classic Polo', 'Slim Fit Polo', 'Sports Polo', 'Striped Polo', 'Full Sleeve Polo', 'Casual Polo'],
    'Ethnic Wear':       ['Panjabi', 'Kurta', 'Sherwani', 'Fatua', 'Wedding Panjabi', 'Cotton Panjabi', 'Embroidered', 'Eid Special'],
    'Underwear & Socks': ['Briefs', 'Boxers', 'Trunks', 'Undershirts', 'Ankle Socks', 'Crew Socks', 'Thermal', 'Athletic Socks'],
    'Activewear':        ['Gym T-Shirts', 'Track Pants', 'Compression', 'Sports Shorts', 'Hoodies', 'Sweatpants', 'Tank Tops', 'Sports Jacket'],
    'Shorts':            ['Chino Shorts', 'Denim Shorts', 'Sports Shorts', 'Cargo Shorts', 'Bermuda', 'Board Shorts'],
    'Blazers':           ['Formal Blazers', 'Casual Blazers', 'Wedding Blazers', 'Linen Blazers', 'Slim Fit', 'Double Breasted'],
  },
  'computer-gaming': {
    'Laptops':           ['Gaming Laptops', 'Ultrabooks', 'Business Laptops', 'Student Laptops', 'MacBook', '2-in-1 Laptops', 'Budget Laptops', 'Workstations'],
    'Desktops':          ['All-in-One', 'Tower PC', 'Mini PC', 'Gaming Desktops', 'Home Desktops', 'Office PCs', 'Custom Build', 'Workstations'],
    'Gaming PCs':        ['Pre-built Gaming', 'RTX 40-Series', 'Mid-range', 'Budget Gaming', 'Streaming PC', 'VR Ready', 'E-Sports', 'Custom Gaming'],
    'Monitors':          ['Gaming Monitor', '4K Monitor', 'Ultrawide', 'Curved Monitor', 'Budget Monitor', '144Hz+', 'IPS Panel', 'OLED Monitor'],
    'Keyboards & Mice':  ['Mechanical Keyboard', 'Wireless Keyboard', 'Gaming Mouse', 'Wireless Mouse', 'Combo Sets', 'RGB Keyboard', 'Ergonomic', 'Compact 60%'],
    'Gaming Chairs':     ['Racing Style', 'Ergonomic Chair', 'High Back', 'Bean Bag', 'Budget Chair', 'Executive Chair', 'Adjustable Arms', 'Lumbar Support'],
    'PC Components':     ['CPU Processors', 'Motherboards', 'RAM Memory', 'Graphics Cards', 'Power Supply', 'CPU Coolers', 'PC Cases', 'Thermal Paste'],
    'Storage & SSDs':    ['NVMe SSD', 'SATA SSD', 'Hard Drives', 'External HDD', 'Portable SSD', 'USB Flash Drive', 'SD Cards', 'NAS Storage'],
    'Routers':           ['Wi-Fi 6 Router', 'Mesh System', 'Gaming Router', 'Budget Router', 'Long Range', '5G Router', 'Travel Router', 'Modem Router'],
    'Webcams':           ['4K Webcam', '1080p Webcam', 'Streaming Webcam', 'Wide Angle', 'Privacy Shutter', 'Ring Light Cam', 'Budget Webcam', 'USB-C Webcam'],
  },
  'home-living': {
    'Furniture':          ['Sofa & Couches', 'Beds & Frames', 'Wardrobes', 'Dining Tables', 'Office Chairs', 'Bookshelves', 'TV Stands', 'Accent Chairs'],
    'Bedding & Pillows':  ['Bed Sheets', 'Comforters', 'Pillows', 'Mattress Protector', 'Blankets', 'Duvet Covers', 'Pillow Covers', 'Mattresses'],
    'Kitchen & Dining':   ['Cookware Sets', 'Cutlery', 'Dinnerware', 'Storage Containers', 'Utensils', 'Bakeware', 'Tea & Coffee', 'Glassware'],
    'Bathroom':           ['Towels', 'Bath Mats', 'Shower Curtains', 'Soap Dispensers', 'Toothbrush Holders', 'Bathroom Cabinet', 'Scales', 'Mirror'],
    'Lighting':           ['Ceiling Lights', 'Floor Lamps', 'Table Lamps', 'LED Strips', 'Night Lights', 'Wall Lights', 'Outdoor Lights', 'Smart Lights'],
    'Wall Decor':         ['Wall Paintings', 'Photo Frames', 'Wall Clocks', 'Canvas Art', 'Wall Stickers', 'Mirrors', 'Tapestry', 'Floating Shelves'],
    'Storage & Shelving': ['Shelving Units', 'Storage Boxes', 'Baskets', 'Drawer Organizers', 'Shoe Racks', 'Wardrobe Organizers', 'Under-Bed Storage', 'Hooks & Rails'],
    'Curtains & Blinds':  ['Blackout Curtains', 'Sheer Curtains', 'Roller Blinds', 'Venetian Blinds', 'Curtain Rods', 'Curtain Hooks', 'Roman Blinds', 'Voile Curtains'],
    'Rugs & Carpets':     ['Area Rugs', 'Runner Rugs', 'Outdoor Rugs', 'Shaggy Rugs', 'Doormats', 'Anti-Slip Mats', 'Kids Rugs', 'Bath Rugs'],
    'Garden & Outdoor':   ['Garden Tools', 'Pots & Planters', 'Garden Furniture', 'Seeds & Plants', 'Outdoor Lighting', 'Watering Cans', 'Garden Decor', 'BBQ Grills'],
  },
  'groceries-pet': {
    'Fresh Produce':    ['Vegetables', 'Fruits', 'Herbs & Spices', 'Salad Greens', 'Mushrooms', 'Exotic Fruits', 'Organic Produce', 'Seasonal'],
    'Packaged Foods':   ['Rice & Grains', 'Pasta & Noodles', 'Canned Goods', 'Flour & Baking', 'Cooking Sauces', 'Breakfast Cereals', 'Instant Food', 'Condiments'],
    'Beverages':        ['Water & Juices', 'Soft Drinks', 'Tea & Coffee', 'Energy Drinks', 'Health Drinks', 'Milk Alternatives', 'Coconut Water', 'Smoothies'],
    'Snacks & Chips':   ['Chips & Crisps', 'Nuts & Seeds', 'Biscuits & Cookies', 'Chocolates', 'Gummy & Candy', 'Popcorn', 'Rice Cakes', 'Dried Fruits'],
    'Pet Food':         ['Dog Food', 'Cat Food', 'Bird Food', 'Fish Food', 'Puppy Food', 'Kitten Food', 'Senior Pet Food', 'Treats & Snacks'],
    'Pet Accessories':  ['Pet Beds', 'Collars & Leashes', 'Toys', 'Grooming Tools', 'Food Bowls', 'Carriers & Crates', 'Clothing', 'Health & Vitamins'],
    'Organic Foods':    ['Organic Rice', 'Organic Vegetables', 'Organic Honey', 'Organic Oils', 'Organic Spices', 'Organic Tea', 'Organic Dairy', 'Superfoods'],
    'Dairy & Eggs':     ['Milk', 'Cheese', 'Yoghurt', 'Butter', 'Eggs', 'Cream', 'Paneer', 'Ghee & Clarified'],
    'Frozen Foods':     ['Frozen Vegetables', 'Frozen Meat', 'Frozen Seafood', 'Ice Cream', 'Frozen Meals', 'Frozen Fries', 'Frozen Paratha', 'Frozen Desserts'],
    'Cooking Oil':      ['Sunflower Oil', 'Soybean Oil', 'Mustard Oil', 'Olive Oil', 'Coconut Oil', 'Palm Oil', 'Rice Bran Oil', 'Ghee'],
  },
  'health-beauty': {
    'Skincare':              ['Face Moisturizers', 'Face Wash', 'Toners', 'Serums', 'Sunscreen', 'Eye Cream', 'Face Masks', 'Exfoliators'],
    'Haircare':              ['Shampoo', 'Conditioner', 'Hair Oil', 'Hair Masks', 'Serums & Sprays', 'Dry Shampoo', 'Hair Color', 'Styling Products'],
    'Makeup & Cosmetics':    ['Foundation', 'Lipstick & Gloss', 'Eyeshadow', 'Mascara', 'Blush & Bronzer', 'Eyeliner', 'Primer', 'Setting Spray'],
    'Fragrances':            ["Women's Perfume", "Men's Cologne", 'Unisex Fragrance', 'Body Mist', 'Deodorant Roll-on', 'Oud Perfume', 'Gift Sets', 'Mini Bottles'],
    'Personal Care':         ['Body Lotion', 'Body Wash', 'Deodorant', 'Hand Cream', 'Lip Balm', 'Intimate Wash', 'Baby Care', 'Foot Care'],
    'Vitamins & Supplements':['Multivitamins', 'Vitamin C', 'Vitamin D', 'Omega-3', 'Protein Powder', 'Probiotics', 'Iron Supplements', 'Calcium'],
    'Medical Devices':       ['Blood Pressure Monitor', 'Glucometer', 'Pulse Oximeter', 'Thermometer', 'Nebulizer', 'TENS Machine', 'Weighing Scale', 'First Aid'],
    'Oral Care':             ['Toothbrush', 'Toothpaste', 'Mouthwash', 'Dental Floss', 'Teeth Whitening', 'Electric Toothbrush', 'Tongue Cleaner', 'Ortho Care'],
    "Men's Grooming":        ['Shaving Kits', 'Aftershave', 'Beard Oil', 'Face Wash', 'Trimmers', 'Moisturizer', 'Hair Gel', 'Cologne'],
    'Feminine Care':         ['Sanitary Pads', 'Tampons', 'Menstrual Cup', 'Panty Liners', 'Feminine Wash', 'Period Underwear', 'PMS Relief', 'Intimate Wipes'],
  },
  'womens-fashion': {
    'Dresses':        ['Casual Dresses', 'Formal Dresses', 'Maxi Dresses', 'Mini Dresses', 'Midi Dresses', 'Party Dresses', 'Floral Dresses', 'Bodycon'],
    'Tops & Blouses': ['T-Shirts', 'Crop Tops', 'Blouses', 'Tank Tops', 'Off-Shoulder', 'Sleeveless', 'Printed Tops', 'Shirt Blouses'],
    'Ethnic Wear':    ['Sarees', 'Salwar Kameez', 'Kurtis', 'Lehengas', 'Anarkali Suits', 'Dupattas', 'Palazzo Sets', 'Sharara'],
    'Jeans & Pants':  ['Skinny Jeans', 'Straight Cut', 'High Waist', 'Wide Leg', 'Palazzo', 'Leggings', 'Trousers', 'Jeggings'],
    'Shoes':          ['Heels', 'Flats', 'Sneakers', 'Sandals', 'Boots', 'Wedges', 'Loafers', 'Flip Flops'],
    'Bags & Clutches':['Handbags', 'Tote Bags', 'Clutches', 'Shoulder Bags', 'Crossbody', 'Backpacks', 'Mini Bags', 'Evening Bags'],
    'Lingerie':       ['Bras', 'Panties', 'Bra Sets', 'Sports Bra', 'Shapewear', 'Nightgowns', 'Slips', 'Camisoles'],
    'Activewear':     ['Yoga Pants', 'Sports Bras', 'Gym T-Shirts', 'Track Suits', 'Shorts', 'Leggings', 'Hoodies', 'Compression'],
    'Swimwear':       ['One-Piece', 'Bikini Sets', 'Swim Shorts', 'Cover-Ups', 'Rash Guards', 'High Waist Bikini', 'Tankini', 'Swim Caps'],
    'Winterwear':     ['Sweaters', 'Cardigans', 'Coats', 'Jackets', 'Thermals', 'Shawls & Stoles', 'Hoodies', 'Turtle Necks'],
  },
  'tv-appliances': {
    'Televisions':      ['4K OLED TV', 'QLED TV', 'Android Smart TV', '32" TVs', '55" TVs', '65"+ TVs', 'Budget TVs', 'Gaming TVs'],
    'Refrigerators':    ['Single Door', 'Double Door', 'Side-by-Side', 'French Door', 'Mini Fridge', 'Chest Freezer', 'Inverter', 'No-Frost'],
    'Washing Machines': ['Front Load', 'Top Load', 'Semi-Automatic', 'Fully Automatic', 'Dryers', 'Washer-Dryer Combo', 'Compact', 'Commercial'],
    'Air Conditioners': ['Split AC', 'Window AC', 'Portable AC', 'Inverter AC', '1 Ton', '1.5 Ton', '2 Ton', 'Cassette AC'],
    'Microwaves':       ['Solo Microwave', 'Grill Microwave', 'Convection Oven', 'OTG', 'Built-in', 'Compact', 'Large Capacity', 'Smart Microwave'],
    'Vacuum Cleaners':  ['Cordless Vacuum', 'Robot Vacuum', 'Upright Vacuum', 'Canister Vacuum', 'Wet & Dry', 'Handheld', 'Budget', 'HEPA Filter'],
    'Air Fryers':       ['Single Basket', 'Dual Basket', 'Large Capacity', 'Compact', 'Toaster Oven', 'Smart Air Fryer', 'Budget', 'Rotisserie'],
    'Water Purifiers':  ['RO Purifier', 'UV Purifier', 'UF Purifier', 'Gravity Filter', 'Wall-Mounted', 'Counter Top', 'Under Sink', 'Smart'],
    'Fans':             ['Ceiling Fan', 'Table Fan', 'Pedestal Fan', 'Tower Fan', 'USB Fan', 'Exhaust Fan', 'Industrial Fan', 'Smart Fan'],
    'Irons & Steamers': ['Dry Iron', 'Steam Iron', 'Garment Steamer', 'Travel Iron', 'Cordless Iron', 'Auto Steam', 'Ceramic Soleplate', 'Steam Station'],
  },
  'lifestyle-hobbies': {
    'Musical Instruments': ['Guitars', 'Keyboards & Piano', 'Drums', 'Violin', 'Harmonium', 'Flute', 'Ukulele', 'Microphones'],
    'Books & Stationery':  ['Fiction Books', 'Educational Books', 'Notebooks', 'Art Supplies', 'Pens & Pencils', 'Planners', 'Sticky Notes', 'Folders'],
    'Art & Craft':         ['Drawing Supplies', 'Painting Kits', 'Clay & Sculpting', 'Knitting & Crochet', 'Paper Craft', 'Diamond Painting', 'Calligraphy', 'Resin Art'],
    'Photography':         ['DSLR Cameras', 'Mirrorless', 'Camera Lenses', 'Tripods', 'Camera Bags', 'Studio Lighting', 'Memory Cards', 'Action Cameras'],
    'Travel Gear':         ['Backpacks', 'Luggage', 'Travel Pillows', 'Passport Holders', 'Travel Adapters', 'Packing Cubes', 'Money Belts', 'Neck Wallets'],
    'Board Games':         ['Strategy Games', 'Card Games', 'Family Games', 'Puzzle Games', 'Chess & Checkers', 'Monopoly', 'Trivial Pursuit', 'Party Games'],
    'Toys & Collectibles': ['Action Figures', 'LEGO Sets', 'Diecast Cars', 'Stuffed Toys', 'RC Toys', 'Funko Pops', 'Model Kits', 'Dolls'],
    'Fitness Equipment':   ['Treadmills', 'Exercise Bikes', 'Resistance Bands', 'Dumbbells', 'Yoga Mats', 'Pull-up Bars', 'Ab Rollers', 'Jump Ropes'],
    'Outdoor Gear':        ['Camping Tents', 'Sleeping Bags', 'Hiking Boots', 'Trekking Poles', 'Headlamps', 'Carabiners', 'Water Bottles', 'First Aid Kits'],
    'Smart Gadgets':       ['Smart Speakers', 'Smart Displays', 'Smart Plugs', 'Smart Bulbs', 'Robot Cleaners', 'Drones', 'VR Headsets', 'AR Glasses'],
  },
  'electronic-accessories': {
    'Headphones & Earbuds': ['Over-Ear ANC', 'In-Ear TWS', 'Wired Earphones', 'Sports Earbuds', 'Gaming Headset', 'Studio Monitor', 'Kids Headphones', 'Budget Earbuds'],
    'Portable Speakers':    ['Bluetooth Speaker', 'Waterproof Speaker', 'Party Speaker', 'Smart Speaker', 'Mini Speaker', 'Desktop Speaker', 'Bookshelf Speaker', 'Karaoke'],
    'Chargers & Cables':    ['Fast Chargers', 'USB-C Cables', 'Lightning Cables', 'Wireless Chargers', 'Multi-Port', 'Car Charger', 'MagSafe', 'Travel Charger'],
    'Power Banks':          ['10000mAh', '20000mAh', 'MagSafe PB', 'Slim Power Bank', 'Solar PB', 'Fast Charging PB', 'Wireless PB', 'Laptop PB'],
    'Screen Protectors':    ['Tempered Glass', 'Matte Guard', 'Privacy Screen', 'Anti-Glare', 'Full Coverage', 'Camera Protector', 'Laptop Guard', 'Tablet Guard'],
    'Phone Cases':          ['Clear Cases', 'Leather Cases', 'Wallet Cases', 'Shockproof', 'Slim Covers', 'Flip Cases', 'Silicone Cases', 'MagSafe Cases'],
    'Memory Cards':         ['microSD 128GB', 'microSD 256GB', 'microSD 512GB', 'SD Cards', 'CFexpress', 'Compact Flash', 'Memory Stick', 'XQD Cards'],
    'USB Hubs':             ['USB-C Hub', 'USB-A Hub', 'Thunderbolt Dock', 'Monitor Hub', 'SD Card Reader', 'Network Adapter', 'HDMI Adapter', 'VGA Adapter'],
    'Smart Home Devices':   ['Smart Switches', 'Smart Plugs', 'IR Blasters', 'Smart Locks', 'Video Doorbells', 'Security Cameras', 'Smart Displays', 'Gateway Hubs'],
    'Webcams & Mics':       ['4K Webcam', '1080p Webcam', 'USB Microphone', 'Condenser Mic', 'Podcast Mic', 'Lavalier Mic', 'Ring Light', 'Green Screen'],
  },
  'watches-bags': {
    'Smartwatches':          ['Apple Watch', 'Samsung Galaxy Watch', 'Fitness Trackers', 'Sports Watch', 'Kids Smartwatch', 'Budget Smartwatch', 'ECG Monitor', 'GPS Watch'],
    'Analog Watches':        ['Casual Watches', 'Formal Watches', 'Luxury Brands', 'Sports Watches', 'Diving Watches', 'Skeleton Watch', 'Automatic', 'Quartz'],
    'Ladies Watches':        ['Fashion Watch', 'Diamond Watch', 'Ceramic Watch', 'Rose Gold', 'Minimalist', 'Bracelet Watch', 'Smartwatch', 'Vintage Style'],
    'Handbags':              ['Shoulder Bags', 'Tote Bags', 'Crossbody Bags', 'Satchel', 'Hobo Bags', 'Barrel Bag', 'Doctor Bag', 'Bucket Bag'],
    'Backpacks':             ['Laptop Backpacks', 'School Bags', 'Travel Backpacks', 'Hiking Backpacks', 'Anti-Theft', 'Fashion Backpacks', 'Kids Backpacks', 'Expandable'],
    'Wallets & Cardholders': ['Bifold Wallet', 'Slim Wallet', 'Money Clip', 'Card Holder', 'Zipper Wallet', 'Long Wallet', "Women's Wallet", 'RFID Blocking'],
    'Sunglasses':            ['Aviator', 'Wayfarer', 'Polarized', 'Sports Sunglasses', 'Cat Eye', 'Round', 'Square Frame', 'UV400'],
    'Belts':                 ['Leather Belts', 'Canvas Belts', 'Reversible Belts', 'Braided Belts', 'Formal Belts', 'Casual Belts', "Women's Belts", 'Suspenders'],
    'Luggage & Trolleys':    ['Carry-On 20"', 'Medium 24"', 'Large 28"', 'Softside', 'Hardside', '4-Wheel Spinner', 'Luggage Sets', 'Duffle Bags'],
    'Travel Accessories':    ['Passport Holder', 'Luggage Tags', 'Packing Cubes', 'Neck Pillows', 'Eye Masks', 'Luggage Scale', 'Travel Locks', 'Cable Organizer'],
  },
  'sports-outdoors': {
    'Running & Jogging': ['Running Shoes', 'Running Shorts', 'Running Tops', 'GPS Watch', 'Water Bottles', 'Running Socks', 'Arm Bands', 'Reflective Gear'],
    'Gym & Fitness':     ['Dumbbells', 'Resistance Bands', 'Gym Gloves', 'Gym Bag', 'Weightlifting Belt', 'Foam Rollers', 'Jump Ropes', 'Ab Wheels'],
    'Cycling':           ['Bikes', 'Helmets', 'Cycling Gloves', 'Cycling Shorts', 'Bike Locks', 'Cycling Jersey', 'Saddle Bags', 'Bike Lights'],
    'Swimming':          ['Swimwear', 'Goggles', 'Swim Cap', 'Kickboard', 'Fins', 'Pull Buoy', 'Ear Plugs', 'Waterproof Bag'],
    'Team Sports':       ['Football', 'Cricket Bat', 'Volleyball', 'Basketball', 'Badminton Set', 'Table Tennis', 'Hockey', 'Rugby Ball'],
    'Camping & Hiking':  ['Tents', 'Sleeping Bags', 'Trekking Poles', 'Hiking Boots', 'Headlamps', 'Backpacks', 'Camping Stove', 'Hammocks'],
    'Martial Arts':      ['Boxing Gloves', 'Punching Bags', 'Protective Gear', 'Gi & Uniforms', 'Hand Wraps', 'Mouthguards', 'Groin Guard', 'Shin Guards'],
    'Yoga & Pilates':    ['Yoga Mats', 'Yoga Blocks', 'Yoga Straps', 'Yoga Pants', 'Pilates Ball', 'Pilates Ring', 'Foam Rollers', 'Meditation Cushions'],
    'Cricket':           ['Cricket Bats', 'Cricket Balls', 'Batting Gloves', 'Pads', 'Helmets', 'Cricket Shoes', 'Wicket Gloves', 'Kit Bags'],
    'Football':          ['Footballs', 'Football Boots', 'Shin Guards', 'Goalkeeper Gloves', 'Football Kits', 'Goal Posts', 'Training Bibs', 'Air Pumps'],
  },
  'mother-baby': {
    'Strollers & Prams':  ['Full-Size Stroller', 'Lightweight Stroller', 'Jogging Stroller', 'Double Stroller', 'Prams', 'Travel System', 'Umbrella Stroller', 'Accessories'],
    'Baby Clothing':      ['Newborn Sets', 'Rompers', 'Sleep Suits', 'Bodysuits', 'Baby Dresses', 'Baby Jackets', 'Socks & Mittens', 'Hats & Caps'],
    'Feeding & Nursing':  ['Baby Bottles', 'Breast Pumps', 'Nursing Bras', 'Nipple Shields', 'Baby Food', 'Highchairs', 'Sippy Cups', 'Bibs'],
    'Diapers & Wipes':    ['Newborn Diapers', 'Baby Wipes', 'Diaper Rash Cream', 'Diaper Bags', 'Changing Mats', 'Pull-Ups', 'Reusable Diapers', 'Potty Training'],
    'Baby Monitors':      ['Video Monitors', 'Audio Monitors', 'Smart Baby Monitor', 'Breathing Monitor', 'Wearable Monitor', 'Split Screen', 'Portable', 'Night Vision'],
    'Car Seats':          ['Infant Car Seat', 'Convertible Seat', 'Booster Seat', 'Combination Seat', 'Travel Bag', 'Mirror for Baby', 'Seat Protector', 'ISOFIX'],
    'Baby Toys':          ['Rattle Toys', 'Soft Toys', 'Educational Toys', 'Activity Gyms', 'Bath Toys', 'Stacking Toys', 'Musical Toys', 'Push & Pull'],
    'Nursery Furniture':  ['Cribs & Cots', 'Changing Tables', 'Nursing Chairs', 'Baby Wardrobe', 'Baby Swing', 'Bassinet', 'Play Yard', 'Night Light'],
    'Bath & Skincare':    ['Baby Shampoo', 'Baby Lotion', 'Baby Wash', 'Diaper Cream', 'Baby Oil', 'Baby Powder', 'Baby Bathtub', 'Hooded Towels'],
    'Maternity':          ['Maternity Clothes', 'Maternity Pillow', 'Belly Band', 'Nursing Pads', 'Prenatal Vitamins', 'Stretch Mark Cream', 'Maternity Bra', 'Support Belt'],
  },
  'automotive': {
    'Car Accessories':      ['Car Mats', 'Seat Covers', 'Steering Wheel Cover', 'Sun Shade', 'Air Freshener', 'Car Organizer', 'Phone Mount', 'Back Seat Organizer'],
    'Motorbike Accessories':['Bike Covers', 'Bike Lock', 'Side Mirrors', 'Handlebar Grips', 'LED Signals', 'Bike Stand', 'Chain & Sprocket', 'Rear Rack'],
    'Car Care & Cleaning':  ['Car Wash Shampoo', 'Wax & Polish', 'Interior Cleaner', 'Microfiber Cloths', 'Tyre Shine', 'Glass Cleaner', 'Vacuum Cleaner', 'Detailing Kit'],
    'Lubricants & Fluids':  ['Engine Oil', 'Gear Oil', 'Brake Fluid', 'Coolant', 'Power Steering Fluid', 'Transmission Oil', 'Grease', 'Fuel Additive'],
    'Tyres & Wheels':       ['Car Tyres', 'Bike Tyres', 'Alloy Wheels', 'Steel Rims', 'Tyre Inflator', 'Tyre Pressure Gauge', 'Wheel Cover', 'Run-Flat Tyres'],
    'Helmets':              ['Full Face', 'Half Face', 'Open Face', 'Flip-Up', 'Kids Helmet', 'Motocross Helmet', 'Racing Helmet', 'Visor & Shield'],
    'GPS & Navigation':     ['GPS Navigator', 'Sat Nav', 'Android Auto', 'Apple CarPlay', 'Bike GPS', 'Hardwire GPS', 'Portable GPS', 'GPS Tracker'],
    'Dash Cams':            ['Front Camera', 'Front & Rear', '4K Dash Cam', 'Night Vision', 'GPS Dash Cam', 'Parking Mode', 'Dual Lens', 'Budget Dash Cam'],
    'Car Audio':            ['Head Units', 'Car Speakers', 'Subwoofers', 'Amplifiers', 'Bluetooth Adapter', 'CD/DVD Players', 'Speaker Grills', 'Wiring Kits'],
    'Jump Starters':        ['Portable Jump Starter', 'Battery Booster', 'Jump Cables', 'Battery Charger', 'Battery Tester', 'Solar Charger', 'Emergency Kit', 'PB Jump Starter'],
  },
  'phones': {
    'Smartphones':      ['Apple iPhone', 'Samsung Galaxy', 'Xiaomi', 'OPPO', 'Vivo', 'OnePlus', 'Realme', 'Google Pixel'],
    'Feature Phones':   ['Nokia', 'Symphony', 'Walton', 'Button Phone', 'Dual SIM', 'Senior Phone', 'Kids Phone', 'Rugged Phone'],
    'Phone Cases':      ['iPhone Cases', 'Samsung Cases', 'Clear Cases', 'Wallet Cases', 'Shockproof', 'Leather Cases', 'Silicone Cases', 'Slim Covers'],
    'Screen Protectors':['Tempered Glass', 'Privacy Glass', 'Anti-Glare', 'Full Coverage', 'Camera Lens Guard', 'Nano Shield', 'UV Liquid Glass', 'Matte Guard'],
    'Chargers & Cables':['USB-C Charger', 'Lightning Charger', 'Wireless Charger', 'MagSafe', 'Car Charger', 'Fast Charger', 'Multi-Port', 'USB-C Cables'],
    'Power Banks':      ['5000mAh', '10000mAh', '20000mAh', 'MagSafe PB', 'Solar PB', 'Slim Compact', 'Wireless PB', 'Fast Charging PB'],
    'Earphones':        ['Wired Earphones', 'Bluetooth Earphones', 'In-Ear TWS', 'Neckband', 'Gaming Earphones', 'Sports Earbuds', 'Bass Earphones', 'Noise Cancelling'],
    'Smartwatches':     ['Apple Watch', 'Samsung Watch', 'Fitness Bands', 'Kids Watch', 'Sports Watch', 'Budget Smartwatch', 'Classic Design', 'AMOLED Watch'],
    'Tablet Cases':     ['iPad Cases', 'Samsung Tab Cases', 'Keyboard Cases', 'Folio Cases', 'Screen Guard', 'Stand Cases', 'Kids Cases', 'Rugged Cases'],
    'Selfie Sticks':    ['Bluetooth Stick', 'Wired Stick', 'Extendable', 'Tripod Stick', 'Ring Light Stick', 'Compact Stick', 'Remote Shutter', 'Desk Tripod'],
  },
};

const categoryUrl = (categorySlug: string, sub?: string, child?: string) => {
  const params = new URLSearchParams();
  if (sub) params.set('sub', sub);
  if (child) params.set('child', child);
  const qs = params.toString();
  return `/category/${categorySlug}${qs ? `?${qs}` : ''}`;
};

// ── 3-column Mega Dropdown ────────────────────────────────────────────────────
function MegaDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [activeCatSlug, setActiveCatSlug] = useState(categories[0].slug);
  const [activeSub, setActiveSub] = useState<string>(() => {
    const subs = Object.keys(subSubMap[categories[0].slug] ?? {});
    return subs[0] ?? '';
  });

  const handleCatEnter = (slug: string) => {
    setActiveCatSlug(slug);
    const subs = Object.keys(subSubMap[slug] ?? {});
    setActiveSub(subs[0] ?? '');
  };

  const goToCategory = (path: string) => {
    navigate(path);
    onClose();
  };

  const activeCategory = categories.find((c) => c.slug === activeCatSlug)!;
  const subcategories = Object.keys(subSubMap[activeCatSlug] ?? {});
  const subSubItems = subSubMap[activeCatSlug]?.[activeSub] ?? [];
  const featuredProduct = products.find((p) => p.category === activeCatSlug);

  return (
    <div
      className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex"
      style={{ width: '860px' }}
    >
      {/* ── Column 1: All categories ─────────────────────────────────────── */}
      <div className="w-48 flex-shrink-0 bg-gray-50 border-r border-gray-100 py-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-1 pb-2">Categories</p>
        {categories.map((cat) => {
          const active = cat.slug === activeCatSlug;
          return (
            <button
              key={cat.id}
              onMouseEnter={() => handleCatEnter(cat.slug)}
              onClick={() => goToCategory(categoryUrl(cat.slug))}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors group ${
                active ? 'bg-white border-r-2 border-orange-500' : 'hover:bg-white'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 border transition-colors ${
                active ? 'border-orange-300' : 'border-gray-200 group-hover:border-orange-200'
              }`}>
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
              </div>
              <span className={`text-xs font-medium flex-1 leading-tight transition-colors ${
                active ? 'text-orange-600' : 'text-gray-700 group-hover:text-orange-500'
              }`}>{cat.name}</span>
              <ChevronRight size={11} className={`flex-shrink-0 ${active ? 'text-orange-400' : 'text-gray-300'}`} />
            </button>
          );
        })}
      </div>

      {/* ── Column 2: Subcategories ──────────────────────────────────────── */}
      <div className="w-48 flex-shrink-0 border-r border-gray-100 py-2 overflow-y-auto" style={{ maxHeight: '520px' }}>
        <div className="flex items-center justify-between px-3 pt-1 pb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{activeCategory.name}</p>
          <Link
            to={categoryUrl(activeCatSlug)}
            onClick={onClose}
            className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            All
          </Link>
        </div>
        {subcategories.map((sub) => {
          const active = sub === activeSub;
          return (
            <button
              key={sub}
              onMouseEnter={() => setActiveSub(sub)}
              onClick={() => goToCategory(categoryUrl(activeCatSlug, sub))}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium transition-colors group ${
                active ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500' : 'text-gray-600 hover:bg-orange-50 hover:text-orange-500'
              }`}
            >
              <span className="leading-tight">{sub}</span>
              <ChevronRight size={11} className={`flex-shrink-0 ${active ? 'text-orange-400' : 'text-gray-300 group-hover:text-orange-300'}`} />
            </button>
          );
        })}
      </div>

      {/* ── Column 3: Sub-sub-categories + featured product ─────────────── */}
      <div className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: '520px' }}>
        {/* Sub-category heading */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 text-sm">{activeSub || activeCategory.name}</h3>
          <Link
            to={categoryUrl(activeCatSlug, activeSub || undefined)}
            onClick={onClose}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight size={11} />
          </Link>
        </div>

        {/* Sub-sub-category grid */}
        {subSubItems.length > 0 && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-4">
            {subSubItems.map((item) => (
              <Link
                key={item}
                to={categoryUrl(activeCatSlug, activeSub, item)}
                onClick={onClose}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-orange-50 hover:text-orange-600 text-xs text-gray-600 transition-colors group"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-orange-400 transition-colors flex-shrink-0" />
                {item}
              </Link>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 mb-3" />

        {/* Featured product */}
        {featuredProduct && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Featured</p>
            <Link
              to={`/product/${featuredProduct.id}`}
              onClick={onClose}
              className="flex gap-3 bg-gray-50 rounded-xl p-2.5 hover:bg-orange-50 border border-transparent hover:border-orange-200 transition-all group"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                <img src={featuredProduct.image} alt={featuredProduct.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 group-hover:text-orange-600 line-clamp-2 leading-snug mb-1">{featuredProduct.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900">৳{featuredProduct.price.toLocaleString()}</span>
                  {featuredProduct.discount && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">-{featuredProduct.discount}%</span>
                  )}
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Nav links ─────────────────────────────────────────────────────────────────
const navLinks = [
  { label: 'New Arrivals', to: '/new-arrivals', icon: Sparkles },
  { label: 'Flash Sale',   to: '/flash-sale',   icon: Zap },
  { label: 'Top Brands',   to: '/search?q=brand', icon: Award },
  { label: 'Vouchers',     to: '/account',      icon: Tag },
];

// ── Header ────────────────────────────────────────────────────────────────────
export default function Header() {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}>
      {/* Promo bar */}
      <div className="bg-orange-500 text-white text-center text-xs py-1.5 px-4 hidden sm:block">
        Free delivery on orders over ৳2000 &nbsp;|&nbsp; Use code <strong>CARTUP10</strong> for 10% off!
      </div>

      {/* Main row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-3">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} className="text-gray-700" /> : <Menu size={22} className="text-gray-700" />}
          </button>

          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              Cart<span className="text-orange-500">up</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-2 sm:mx-4">
            <div className="flex items-center bg-gray-100 rounded-xl border border-gray-200 hover:border-orange-300 focus-within:border-orange-400 focus-within:bg-white transition-all duration-200">
              <Search size={18} className="ml-3 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands & categories..."
                className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none text-gray-700 placeholder-gray-400"
              />
              <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-r-xl transition-colors duration-150 hidden sm:block">
                Search
              </button>
            </div>
          </form>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/seller/login"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 hover:border-orange-400"
            >
              <Store size={16} />
              <span className="hidden lg:block">Sell on Cartup</span>
            </Link>
            <Link to="/account" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
              <User size={18} />
              <span className="hidden md:block font-medium">Account</span>
            </Link>
            <Link to="/cart" className="relative flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
              <ShoppingCart size={20} />
              <span className="hidden md:block font-medium">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 pb-2 border-t border-gray-100 pt-2">
          <div ref={catRef} className="relative">
            <button
              onClick={() => setCatDropdownOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors mr-2 ${
                catDropdownOpen ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:text-orange-500 hover:bg-orange-50'
              }`}
            >
              <Menu size={16} />
              All Categories
              <ChevronDown size={14} className={`transition-transform duration-200 ${catDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {catDropdownOpen && <MegaDropdown onClose={() => setCatDropdownOpen(false)} />}
          </div>

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-orange-500 hover:bg-orange-50 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <link.icon size={14} />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg max-h-[70vh] overflow-y-auto">
          <nav className="px-4 py-3 space-y-1">
            <Link to="/category/all" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors font-medium" onClick={() => setMobileMenuOpen(false)}>
              <Grid3X3 size={15} />All Categories
            </Link>
            {navLinks.map((link) => (
              <Link key={link.label} to={link.to} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <link.icon size={15} />{link.label}
              </Link>
            ))}
            <hr className="border-gray-100 my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</p>
            {categories.map((cat) => {
              const subs = Object.keys(subSubMap[cat.slug] ?? {});
              return (
                <MobileCategoryRow
                  key={cat.id}
                  cat={cat}
                  subs={subs}
                  subSubMap={subSubMap[cat.slug] ?? {}}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              );
            })}
            <hr className="border-gray-100 my-2" />
            <Link to="/seller/login" className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 font-semibold hover:bg-orange-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
              <Store size={15} />Sell on Cartup
            </Link>
            <Link to="/account" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" onClick={() => setMobileMenuOpen(false)}>
              <User size={15} />My Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

// ── Mobile: 3-level expandable rows ──────────────────────────────────────────
function MobileCategoryRow({
  cat, subs, subSubMap, onNavigate,
}: {
  cat: { id: string; name: string; image: string; slug: string };
  subs: string[];
  subSubMap: Record<string, string[]>;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);

  return (
    <div>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="w-6 h-6 rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
          <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
        </div>
        <span className="flex-1 text-left font-medium">{cat.name}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 text-gray-400 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pl-11 pr-2 pb-1">
          <Link
            to={categoryUrl(cat.slug)}
            onClick={onNavigate}
            className="block text-xs font-semibold text-orange-500 hover:underline py-1 mb-1"
          >
            View All {cat.name}
          </Link>
          {subs.map((sub) => {
            const subItems = subSubMap[sub] ?? [];
            const subOpen = openSub === sub;
            return (
              <div key={sub}>
                <div className="flex items-center gap-1">
                  <Link
                    to={categoryUrl(cat.slug, sub)}
                    onClick={onNavigate}
                    className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium text-gray-600 hover:text-orange-500 hover:bg-orange-50 transition-colors"
                  >
                    {sub}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Show ${sub} subcategories`}
                    className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                    onClick={() => setOpenSub(subOpen ? null : sub)}
                  >
                    <ChevronDown size={12} className={`text-gray-400 transition-transform ${subOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {subOpen && (
                  <div className="pl-3 pb-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {subItems.map((item) => (
                      <Link
                        key={item}
                        to={categoryUrl(cat.slug, sub, item)}
                        onClick={onNavigate}
                        className="text-[11px] text-gray-500 hover:text-orange-500 py-1 px-1.5 flex items-center gap-1 transition-colors"
                      >
                        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                        {item}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
