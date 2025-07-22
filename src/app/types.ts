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