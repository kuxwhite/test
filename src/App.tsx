import { MotionConfig, motion } from "motion/react";
import { Hero } from "./components/Hero";
import { SearchCard } from "./components/SearchCard";

const QUICK = [
  { icon: "/assets/icon-fire.png", title: "Hot\ntickets" },
  { icon: "/assets/icon-globe.png", title: "Surprise me" },
  { icon: "/assets/icon-sparkles.png", title: "Smart search" },
  { icon: "/assets/icon-route.png", title: "Custom route" },
];

// Images for these cards are pending: the Figma image fills could not be exported yet.
const PLANS = [
  { title: "Watch\nthe whales", place: "Murmansk", price: "from 5,389 ₽" },
  { title: "Catch a sunrise\nin the sky", place: "Murmansk", price: "from 5,389 ₽" },
  { title: "Take in\nthe wild nature", place: "Murmansk", price: "from 5,389 ₽" },
  { title: "Hike up\nto Kazbegi", place: "Murmansk", price: "from 5,389 ₽" },
];

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="stage">
        <div className="screen">
          <div className="screen__scroll">
            <Hero />
            <main className="content">
              <SearchCard />

              <nav className="quick" aria-label="Quick search">
                {QUICK.map((q) => (
                  <motion.button key={q.title} className="quick__item" whileTap={{ scale: 0.95 }}>
                    <img src={q.icon} alt="" width={48} height={48} />
                    <span>{q.title}</span>
                  </motion.button>
                ))}
              </nav>

              <section className="plans">
                <h2 className="plans__title">Plans for autumn</h2>
                <div className="plans__list">
                  {PLANS.map((p) => (
                    <article key={p.title} className="plan">
                      <div className="plan__image" />
                      <div className="plan__info">
                        <h3>{p.title}</h3>
                        <p>{p.place}</p>
                        <p>{p.price}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </main>
          </div>
          <img className="status-bar" src="/assets/status-bar.png" alt="" width={402} height={62} />
        </div>
      </div>
    </MotionConfig>
  );
}
