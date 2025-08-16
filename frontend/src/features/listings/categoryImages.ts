import bikes from '../../../../brand/images/cat-bicicletas.jpg'
import photo from '../../../../brand/images/cat-fotografia.jpg'
import music from '../../../../brand/images/cat-instrumentos.jpg'
import tech from '../../../../brand/images/cat-tecnologia.jpg'

/** Fotos de las categorías de demo por código. Las categorías nuevas del admin se muestran sin foto. */
export const categoryImages: Record<string, string> = {
  tecnologia: tech,
  instrumentos: music,
  movilidad: bikes,
  fotografia: photo,
}
