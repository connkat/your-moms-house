export type DbProfile = {
	name: string;
};

export type DbUserItemResponse = {
	item_id: number;
	count: number;
	user_id: string;
	profile: DbProfile;
};

export type ItemWithCommitments = {
	id: number;
	name: string;
	description?: string;
	total_count: number;
	max_count: number;
	created_at: string;
	commitments: Commitment[];
};

export type CategoryWithItems = {
	id: number;
	name: string;
	created_at: string;
	items: ItemWithCommitments[];
};

export type DbCategory = {
	id: number;
	name: string;
	created_at: string;
	items: {
		id: number;
		name: string;
		description?: string;
		max_count: number;
		total_count: number;
		created_at: string;
	}[];
};

export type Commitment = {
	count: number;
	userName: string;
	userId: string;
};

export type Shift = {
	id: number;
	event_name: string;
	description: string;
	shift_start: string;
	shift_end: string;
	count: number;
	max_count: number;
	created_at: string;
	signups: ShiftSignup[];
};

export type ShiftSignup = {
	userName: string;
	userId: string;
	created_at: string;
};

export type DbShift = {
	id: number;
	event_name: string;
	description: string;
	shift_start: string;
	shift_end: string;
	count: number;
	max_count: number;
	created_at: string;
};

export type DbShiftSignup = {
	id: number;
	user_id: string;
	shift_id: number;
	created_at: string;
	profile: DbProfile;
};