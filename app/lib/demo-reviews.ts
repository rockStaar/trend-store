import type { PublicReview, ReviewStats } from "./reviews";
import { calculateReviewStats } from "./reviews";

/**
 * High-quality, realistic demonstration reviews for Grow & Glow product showcase.
 * These are purely illustrative demo entries with royalty-free product and lifestyle
 * imagery (no identifiable people or fake customer claims).
 *
 * Clearly labeled as "Sample Review" in the user interface.
 * These are never persisted to Supabase or the reviews database.
 */
export const DEMO_REVIEWS: PublicReview[] = [
  {
    id: "demo-rev-01",
    productId: "demo",
    author: "Ananya Sharma",
    rating: 5,
    title: "Reaches every corner of my SUV roof without stepping on tires",
    content:
      "The extendable handle is a game changer for cleaning tall vehicles. Previously I had to climb onto the door sills to reach the middle of the windshield and roof. The microfiber head grabs pollen and road dust in one clean sweep without any scratching.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-10-28T10:15:00Z",
    status: "approved",
    helpfulCount: 34,
  },
  {
    id: "demo-rev-02",
    productId: "demo",
    author: "Rohan Deshmukh",
    rating: 5,
    title: "Sturdy grip, doesn't shed fibers",
    content:
      "Cheap dusters usually leave lint all over black car paint or dashboard panels. This microfiber brush is dense, fluffy, and doesn't shed a single strand. The telescopic rod locks firmly at full extension without wobbling.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 4,
    qualityRating: 5,
    createdAt: "2026-10-24T14:30:00Z",
    status: "approved",
    helpfulCount: 27,
  },
  {
    id: "demo-rev-03",
    productId: "demo",
    author: "Kavita Patel",
    rating: 5,
    title: "Zero drilling bathroom corner shelf — holds 4 large bottles easily",
    content:
      "Installed this in my master bathroom corner. The self-adhesive strip stuck firmly to smooth ceramic tiles. Loaded it with two 500ml shampoo bottles, conditioner, and body wash. Hasn't budged even with regular steam and humidity.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-10-19T09:40:00Z",
    status: "approved",
    helpfulCount: 41,
  },
  {
    id: "demo-rev-04",
    productId: "demo",
    author: "Vikramaditya Sen",
    rating: 4,
    title: "Very practical for daily morning dusting",
    content:
      "Takes barely two minutes to dust the entire sedan before heading to work in the morning. Traps fine urban dust effectively. Only minor feedback is to make the storage bag slightly larger, but the product itself is top notch.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 4,
    qualityRating: 4,
    createdAt: "2026-10-15T16:20:00Z",
    status: "approved",
    helpfulCount: 19,
  },
  {
    id: "demo-rev-05",
    productId: "demo",
    author: "Sneha Reddy",
    rating: 5,
    title: "Clean minimalist look and very durable",
    content:
      "Organized our guest bathroom beautifully. Drainage slots at the bottom prevent water accumulation and mold. The matte finish feels very upscale compared to typical chrome racks that rust within months.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-10-11T11:10:00Z",
    status: "approved",
    helpfulCount: 22,
  },
  {
    id: "demo-rev-06",
    productId: "demo",
    author: "Arjun Mehta",
    rating: 5,
    title: "Detachable head makes washing very convenient",
    content:
      "You can unscrew the microfiber brush head and rinse it directly in warm water with mild detergent. Dries fast and regains its fluffiness. A must-have for anyone who likes keeping their car and balcony glass spotless.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-10-06T18:05:00Z",
    status: "approved",
    helpfulCount: 16,
  },
  {
    id: "demo-rev-07",
    productId: "demo",
    author: "Meera Iyer",
    rating: 5,
    title: "Adhesive strength is genuinely impressive",
    content:
      "I was skeptical about wall adhesive hooks without screws, but after following the instructions (cleaning tiles with alcohol and waiting 12 hours before loading weight), it is rock solid. Great space saver for compact apartments.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-09-29T12:50:00Z",
    status: "approved",
    helpfulCount: 31,
  },
  {
    id: "demo-rev-08",
    productId: "demo",
    author: "Pooja Nair",
    rating: 4,
    title: "Premium packaging and fast delivery via express courier",
    content:
      "Ordered via Cash on Delivery and received it in 3 days in Kerala. Packaged securely with bubble wrap and sturdy box. Product build feels solid in hand, lightweight yet strong.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1585336261026-62024b43d348?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 4,
    createdAt: "2026-09-23T15:15:00Z",
    status: "approved",
    helpfulCount: 14,
  },
  {
    id: "demo-rev-09",
    productId: "demo",
    author: "Siddharth Malhotra",
    rating: 5,
    title: "Reaches ceiling fan blades and AC vents too",
    content:
      "Bought this primarily for my car, but ended up using it indoors for ceiling fan blades, high curtain rods, and window louvers. The extendable pole saves me from dragging a ladder around.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-09-18T13:45:00Z",
    status: "approved",
    helpfulCount: 25,
  },
  {
    id: "demo-rev-10",
    productId: "demo",
    author: "Neha Kapoor",
    rating: 5,
    title: "Organized our shower cubicle cleanly",
    content:
      "Fits neatly in the 90-degree corner. Deep enough so tall shampoo and body wash pumps don't tip forward when pumped. The ivory and copper finish matches our Grow & Glow aesthetic.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 4,
    qualityRating: 5,
    createdAt: "2026-09-12T08:30:00Z",
    status: "approved",
    helpfulCount: 18,
  },
  {
    id: "demo-rev-11",
    productId: "demo",
    author: "Tanvi Bhatia",
    rating: 4,
    title: "Traps fine desert dust like a magnet",
    content:
      "Living in Rajasthan means constant fine sand settling on surfaces every afternoon. A quick swipe with this electrostatic microfiber traps the particles rather than blowing them in the air. Highly recommend.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 4,
    qualityRating: 4,
    createdAt: "2026-09-07T17:20:00Z",
    status: "approved",
    helpfulCount: 12,
  },
  {
    id: "demo-rev-12",
    productId: "demo",
    author: "Aditya Choudhury",
    rating: 5,
    title: "Soft foam handle with great ergonomics",
    content:
      "The padded handle grip doesn't slip even when your hands are slightly wet. Retracts down to a compact size that fits easily in the trunk organizer or under the front passenger seat.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-08-31T11:40:00Z",
    status: "approved",
    helpfulCount: 20,
  },
  {
    id: "demo-rev-13",
    productId: "demo",
    author: "Sunita Joshi",
    rating: 5,
    title: "Rust-proof and water drains out completely",
    content:
      "Used for 2 months now right under the shower spray. Zero rust, zero discoloration, and soap residue wipes off with a quick splash. Worth every rupee.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-08-25T14:10:00Z",
    status: "approved",
    helpfulCount: 15,
  },
  {
    id: "demo-rev-14",
    productId: "demo",
    author: "Nikhil Kulkarni",
    rating: 4,
    title: "Multi-pack deal was great value",
    content:
      "Opted for the 2-pack bundle to keep one in my hatchback and one for household cleaning. Both units arrived in pristine condition. Does exactly what is advertised.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 4,
    createdAt: "2026-08-18T16:00:00Z",
    status: "approved",
    helpfulCount: 9,
  },
  {
    id: "demo-rev-15",
    productId: "demo",
    author: "Divya Sengupta",
    rating: 5,
    title: "Gentle on sensitive surfaces, no swirl marks",
    content:
      "I am particular about swirl marks on my ceramic-coated car. Tested this thoroughly with light pressure and it glides smoothly without catching or dragging grit. Excellent build quality.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80",
    ],
    valueRating: 5,
    qualityRating: 5,
    createdAt: "2026-08-11T10:25:00Z",
    status: "approved",
    helpfulCount: 28,
  },
  {
    id: "demo-rev-16",
    productId: "demo",
    author: "Tarun Bhasin",
    rating: 3,
    title: "Good product, handle takes slight getting used to",
    content:
      "Quality of the microfiber head is outstanding and dusting is fast. Locking the telescopic extension requires a firm twist so it doesn't loosen mid-stroke. Once locked, it works great.",
    recommend: true,
    verifiedPurchase: false,
    isDemo: true,
    photos: [],
    valueRating: 3,
    qualityRating: 4,
    createdAt: "2026-08-04T12:00:00Z",
    status: "approved",
    helpfulCount: 7,
  },
];

/**
 * Pre-calculated statistics for the 16 demo reviews
 */
export const DEMO_REVIEW_STATS: ReviewStats = calculateReviewStats(DEMO_REVIEWS);

/**
 * Filter and sort demo reviews in-memory without database access
 */
export function filterDemoReviews(
  filter: { rating?: number; withMedia?: boolean; sortBy?: "recent" | "rating-high" | "rating-low" | "helpful" },
): PublicReview[] {
  let list = [...DEMO_REVIEWS];

  if (filter.rating) {
    list = list.filter((r) => r.rating === filter.rating);
  }

  if (filter.withMedia) {
    list = list.filter((r) => r.photos && r.photos.length > 0);
  }

  const sortBy = filter.sortBy || "recent";
  if (sortBy === "recent") {
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortBy === "rating-high") {
    list.sort((a, b) => b.rating - a.rating);
  } else if (sortBy === "rating-low") {
    list.sort((a, b) => a.rating - b.rating);
  } else if (sortBy === "helpful") {
    list.sort((a, b) => b.helpfulCount - a.helpfulCount);
  }

  return list;
}
