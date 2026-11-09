// La pastille d'un membre, à la couleur de sa catégorie.
export function Dot({ colour, className = "" }: { colour: string; className?: string }) {
  return <span aria-hidden="true" style={{ background: colour }}
    className={`inline-block size-[11px] flex-none rounded-full shadow-[0_0_0_1px_rgba(0,0,0,.4)] ${className}`} />;
}
