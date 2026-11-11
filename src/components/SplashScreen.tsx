/**
 * Logo splash shown on the first page of a visit (optional, per client).
 * It never blocks the page: the page renders underneath and the overlay fades out after
 * 2 seconds via CSS (see globals.css). The script in the layout's <head> hides it on later
 * pages of the same visit.
 */
export default function SplashScreen({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <div id="site-splash" aria-hidden className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-white">
      <div className="text-center">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto mb-6 h-32 w-auto" />
        )}
        <p className="mb-2 text-2xl font-bold uppercase text-gray-800">{name}</p>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  )
}

/** Runs before the page paints: hide the splash if this visit has already seen it. */
export const splashScript = `try{if(sessionStorage.getItem('splash-seen')){document.documentElement.setAttribute('data-splash-seen','')}else{sessionStorage.setItem('splash-seen','1')}}catch(e){}`
