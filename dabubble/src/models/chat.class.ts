export interface Chat {
    id: string;
    message: string;
    time: number;
    user: string;
    reactions?: Record<string, string[] | string>;
}