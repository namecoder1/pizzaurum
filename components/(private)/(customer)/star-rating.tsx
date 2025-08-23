import { Rating as ReactRating } from '@smastrom/react-rating'
import '@smastrom/react-rating/style.css'

export function Rating({ rating, setRating }: { rating: number, setRating: (rating: number | undefined) => void }) {

  return <ReactRating style={{ maxWidth: 100 }} value={rating} onChange={setRating} />
}