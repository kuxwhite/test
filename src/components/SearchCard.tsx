import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

type Field = { label: string; value: string; caret?: boolean };
type Tab = { id: string; title: string; icon: string; fields: [Field, Field] };

const TABS: Tab[] = [
  {
    id: "flights",
    title: "Flights",
    icon: "/assets/tab-plane.png",
    fields: [
      { label: "From", value: "Perm" },
      { label: "To", value: "Vietnam", caret: true },
    ],
  },
  {
    id: "hotels",
    title: "Hotels",
    icon: "/assets/tab-bed.png",
    fields: [
      { label: "City", value: "Da Nang", caret: true },
      { label: "Dates", value: "12 – 19 November" },
    ],
  },
  {
    id: "impression",
    title: "Impression",
    icon: "/assets/tab-tree.png",
    fields: [
      { label: "Where", value: "Vietnam", caret: true },
      { label: "When", value: "Any weekend" },
    ],
  },
];

const spring = { type: "spring", stiffness: 420, damping: 38, mass: 0.9 } as const;

/** Flight Search (Figma 89:923) with animated tab switching. */
export function SearchCard() {
  const [[active, direction], setState] = useState<[number, number]>([0, 0]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [rowX, setRowX] = useState(0);

  const select = (index: number) => {
    if (index === active || index < 0 || index >= TABS.length) return;
    setState([index, index > active ? 1 : -1]);
  };

  // Slide the tab row so the active tab sits at the left edge
  // (clamped so the row never leaves empty space on the right).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const first = tabRefs.current[0];
    const tab = tabRefs.current[active];
    const last = tabRefs.current[TABS.length - 1];
    if (!viewport || !first || !tab || !last) return;
    // offsetLeft is relative to the card, so measure from the first tab.
    const left = tab.offsetLeft - first.offsetLeft;
    const rowWidth = last.offsetLeft + last.offsetWidth - first.offsetLeft;
    const style = getComputedStyle(viewport);
    const visible = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const maxShift = Math.max(0, rowWidth - visible);
    setRowX(-Math.min(left, maxShift));
  }, [active]);

  const onSwipe = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -60) select(active + 1);
    else if (swipe > 60) select(active - 1);
  };

  const tab = TABS[active];

  return (
    <section className="search">
      <div className="search__tabs" ref={viewportRef} role="tablist" aria-label="Search type">
        <motion.div className="search__tabs-row" animate={{ x: rowX }} transition={spring}>
          {TABS.map((t, i) => {
            const isActive = i === active;
            return (
              <motion.button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                aria-selected={isActive}
                aria-controls="search-panel"
                className="search__tab"
                onClick={() => select(i)}
                animate={{ opacity: isActive ? 1 : 0.6 }}
                whileTap={{ scale: 0.94 }}
                transition={{ duration: 0.25 }}
              >
                <motion.img
                  src={t.icon}
                  alt=""
                  width={24}
                  height={24}
                  animate={isActive ? { rotate: [0, -12, 8, 0], scale: [1, 1.18, 1] } : { rotate: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                <span>{t.title}</span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <motion.div
        id="search-panel"
        role="tabpanel"
        aria-label={tab.title}
        className="search__fields"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={onSwipe}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={tab.id}
            className="search__fields-inner"
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring}
          >
            <FieldBox field={tab.fields[0]} />
            <img className="search__notch" src="/assets/fields-notch.png" alt="" width={49} height={3} />
            <FieldBox field={tab.fields[1]} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <motion.button
        className="search__button"
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.01 }}
        transition={spring}
      >
        Search
      </motion.button>
    </section>
  );
}

function FieldBox({ field }: { field: Field }) {
  return (
    <div className="field">
      <span className="field__label">{field.label}</span>
      <span className="field__value">
        {field.value}
        {field.caret && <span className="field__caret" aria-hidden />}
      </span>
    </div>
  );
}
