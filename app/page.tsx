import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { Code2, Palette, Megaphone, ShoppingCart, ArrowRight, Users, Sparkles } from "lucide-react";
import type { HomeContent, Batch, GalleryImage } from "@/types";

const COURSE_ICONS: Record<string, any> = {
  web: Code2,
  graphic: Palette,
  marketing: Megaphone,
  ecommerce: ShoppingCart,
};

const DEFAULT_CONTENT: HomeContent = {
  id: "default",
  hero_title: "Shape Your Future With IT HUB",
  hero_subtitle:
    "Premium IT training in Web Development, Graphic Designing, Digital Marketing & E-Commerce.",
  about_text:
    "IT HUB Institute is a leading technology training center dedicated to producing industry-ready professionals through hands-on, project-based learning.",
  why_choose_us_points: [
    "Expert Instructors",
    "Hands-on Projects",
    "Job Placement Support",
    "Modern Curriculum",
  ],
  contact_phone: "03324455006",
  contact_address: "IT HUB Institute, Kohlu",
  contact_email: "ithubkohlu@gmail.com",
  course_descriptions: {
    web: { title: "Web Developing", desc: "Learn HTML, CSS, JS, React & Next.js from scratch to advanced." },
    graphic: { title: "Graphic Designing", desc: "Master Photoshop, Illustrator & modern design principles." },
    marketing: { title: "Digital Marketing", desc: "SEO, Social Media Marketing, Google & Meta Ads." },
    ecommerce: { title: "E-Commerce", desc: "Amazon, Shopify & dropshipping business mastery." },
  },
};

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const { data: contentRow } = await supabase.from("home_content").select("*").limit(1).maybeSingle();
  const content: HomeContent = (contentRow as HomeContent) || DEFAULT_CONTENT;

  const { data: batches } = await supabase
    .from("batches")
    .select("*")
    .eq("is_announced", true)
    .order("created_at", { ascending: false });

  const { data: galleryImages } = await supabase
    .from("gallery")
    .select("*")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });

  const openBatches = (batches || []).filter(
    (b: Batch) => b.status === "Open" && b.seats_filled < b.seats_total
  );

  return (
    <>
      <Navbar />

      {openBatches.length > 0 && (
        <div className="bg-neon-gradient overflow-hidden">
          <div className="whitespace-nowrap py-2 animate-marquee text-sm font-semibold text-white">
            {openBatches
              .map(
                (b: Batch) =>
                  `🎓 Admissions Open for ${b.batch_name} — Limited ${b.seats_total} Seats!`
              )
              .join("     •     ")}
          </div>
        </div>
      )}

      {/* HERO */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(11,96,176,0.25),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(0,209,255,0.2),transparent_40%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-accent mb-6">
            <Sparkles size={14} /> Admissions Open Now
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6">
            <span className="text-gradient">{content.hero_title}</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-lg mb-10">{content.hero_subtitle}</p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/apply" className="btn-neon text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2">
              Enroll Now <ArrowRight size={18} />
            </Link>
            <a href="#courses" className="glass px-8 py-3 rounded-xl font-semibold text-white/90">
              Explore Courses
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT / WHY CHOOSE US */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-4">
            About <span className="text-gradient">IT HUB</span>
          </h2>
          <p className="text-white/70 leading-relaxed">{content.about_text}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {content.why_choose_us_points.map((point, i) => (
            <div key={i} className="glass rounded-xl p-5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-neon-gradient flex items-center justify-center shrink-0 shadow-glow">
                <Users size={16} className="text-white" />
              </div>
              <p className="text-sm text-white/80 pt-1.5">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COURSES */}
      <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Our <span className="text-gradient">Courses</span>
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(content.course_descriptions).map(([key, course]) => {
            const Icon = COURSE_ICONS[key] || Code2;
            return (
              <div
                key={key}
                className="glass rounded-2xl p-6 hover:shadow-glow transition-shadow group"
              >
                <div className="h-12 w-12 rounded-xl bg-neon-gradient flex items-center justify-center mb-5 shadow-glow group-hover:animate-float">
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{course.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{course.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* BATCHES */}
      <section id="batches" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Current <span className="text-gradient">Batches</span>
        </h2>
        {(!batches || batches.length === 0) ? (
          <p className="text-center text-white/50">No batches announced yet. Check back soon!</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((b: Batch) => {
              const filled = b.seats_filled >= b.seats_total;
              const pct = Math.min(100, Math.round((b.seats_filled / b.seats_total) * 100));
              const effectiveStatus = filled ? "Closed" : b.status;
              return (
                <div key={b.id} className="glass rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{b.batch_name}</h3>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        effectiveStatus === "Open"
                          ? "bg-accent/20 text-accent"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {effectiveStatus}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm mb-4">{b.course_name}</p>
                  <p className="text-white/50 text-xs mb-4">
                    {new Date(b.start_date).toLocaleDateString()} — {new Date(b.end_date).toLocaleDateString()}
                  </p>
                  <div className="w-full h-2 rounded-full bg-white/10 mb-2 overflow-hidden">
                    <div className="h-full bg-neon-gradient" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-white/50">
                    {b.seats_total - b.seats_filled} seats left of {b.seats_total}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* GALLERY */}
      {galleryImages && galleryImages.length > 0 && (
        <GallerySection images={galleryImages as GalleryImage[]} />
      )}

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="glass rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to start your journey?</h2>
          <p className="text-white/60 mb-6">Apply today and secure your seat before batches fill up.</p>
          <Link href="/apply" className="btn-neon text-white px-8 py-3 rounded-xl font-semibold inline-flex items-center gap-2">
            Enroll Now <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer phone={content.contact_phone} email={content.contact_email} address={content.contact_address} />
    </>
  );
}

function GallerySection({ images }: { images: GalleryImage[] }) {
  const batchNames = Array.from(new Set(images.map((i) => i.batch_name).filter(Boolean)));
  return (
    <section id="gallery" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <h2 className="text-3xl font-bold text-center mb-4">
        Our <span className="text-gradient">Gallery</span>
      </h2>
      {batchNames.length > 0 && (
        <p className="text-center text-white/40 text-sm mb-10">Filter available in gallery view</p>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.slice(0, 9).map((img) => (
          <div key={img.id} className="glass rounded-xl overflow-hidden group">
            <div className="relative h-56 w-full">
              <Image
                src={img.image_url}
                alt={img.caption || "Gallery image"}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            {img.caption && (
              <p className="p-3 text-xs text-white/60">{img.caption}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
