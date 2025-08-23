import type { components, operations } from './schema'

type Schemas = components['schemas']

export type Listing = Schemas['Listing']
export type ListingStatus = Schemas['ListingStatusEnum']
export type Condition = Schemas['ConditionEnum']
export type Category = Schemas['Category']
export type Message = Schemas['Message']
export type Notification = Schemas['Notification']
export type User = Schemas['User']
export type ListingEvent = Schemas['ListingEvent']
export type ListingAction = Schemas['AvailableActionsEnum']
export type PickupBy = Schemas['PickupPickupByEnum']
export type NotificationKind = Schemas['KindEnum']
export type Dashboard = Schemas['Dashboard']
export type OfferRow = Schemas['OfferRow']

type OfferQuery = NonNullable<operations['listings_offers_list']['parameters']['query']>
export type Queue = NonNullable<OfferQuery['queue']>
export type OfferOrdering = NonNullable<OfferQuery['ordering']>
