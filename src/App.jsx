import { useState } from 'react'
import avatar from './assets/img/avatar.png'
import fire from './assets/img/fire.png'
import globe from './assets/img/globe.png'
import sparkles from './assets/img/sparkles.png'
import arrow from './assets/img/arrow.png'
import whales from './assets/img/whales.jpg'
import sunrise from './assets/img/sunrise.jpg'
import kasbah from './assets/img/kasbah.jpg'
import mountains from './assets/img/mountains.jpg'
import heartIcon from './assets/icons/heart.svg'
import planeIcon from './assets/icons/plane.svg'
import bedIcon from './assets/icons/bed.svg'
import treeIcon from './assets/icons/tree.svg'
import connector from './assets/icons/connector.svg'
import WindowScene from './WindowScene.jsx'

// Figma: Концепты / Screen 71:1738
const TABS = [
  { id: 'flights', label: 'Flights', icon: planeIcon },
  { id: 'hotels', label: 'Hotels', icon: bedIcon },
  { id: 'impression', label: 'Impression', icon: treeIcon },
]
const SHORTCUTS = [
  { label: ['Hot', 'tickets'], img: fire },
  { label: ['Surprise', 'me'], img: globe },
  { label: ['Smart', 'search'], img: sparkles },
  { label: ['Custom', 'route'], img: arrow },
]
const PLANS = [
  { title: ['Watch', 'the whales'], img: whales },
  { title: ['Catch a sunrise', 'in the sky'], img: sunrise },
  { title: ['Take in', 'the wild nature'], img: kasbah },
  { title: ['Hike up', 'to Kazbegi'], img: mountains },
]

export default function App() {
  const [tab, setTab] = useState('flights')
  const [from, setFrom] = useState('Perm')
  const [to, setTo] = useState('Vietnam')
  const [liked, setLiked] = useState(false)

  return (
    <main className="screen">
      <header className="hero">
        <WindowScene tab={tab} />
        <div className="hero-haze" aria-hidden />
        <div className="hero-fade" aria-hidden />
        <div className="profile">
          <div className="me">
            <span className="avatar"><img src={avatar} alt="" /></span>
            <span className="me-name">Kirill</span>
          </div>
          <button className={'glass-btn' + (liked ? ' on' : '')} aria-label="Favourites" aria-pressed={liked}
                  onClick={() => setLiked(v => !v)}>
            <img src={heartIcon} alt="" width="24" height="24" />
          </button>
        </div>
      </header>

      <div className="content">
        <section className="search" aria-label="Flight search">
          <div className="tabs" role="tablist">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id}
                      className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
                <img src={t.icon} alt="" width="24" height="24" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <form className="fields" onSubmit={e => e.preventDefault()}>
            <label className="field">
              <span className="field-label">From</span>
              <input value={from} onChange={e => setFrom(e.target.value)} autoComplete="off" />
            </label>
            <img className="connector" src={connector} alt="" width="48.5" height="3" />
            <label className="field">
              <span className="field-label">To</span>
              <input value={to} onChange={e => setTo(e.target.value)} autoComplete="off" />
            </label>
            <button className="search-btn" type="submit">Search</button>
          </form>
        </section>

        <nav className="shortcuts" aria-label="Shortcuts">
          {SHORTCUTS.map(s => (
            <button key={s.label.join(' ')} className="shortcut">
              <img src={s.img} alt="" width="48" height="48" />
              <span>{s.label[0]}<br />{s.label[1]}</span>
            </button>
          ))}
        </nav>

        <section className="plans">
          <h2>Plans for autumn</h2>
          <div className="plans-row">
            {PLANS.map(p => (
              <article key={p.title.join(' ')} className="plan">
                <img src={p.img} alt="" width="156" height="156" />
                <div className="plan-info">
                  <p className="plan-title">{p.title[0]}<br />{p.title[1]}</p>
                  <p>Murmansk</p>
                  <p>from 5,389 ₽</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
