export interface Answer {
  isUserMissing: any;
  _caretIndex: number | null | undefined;
  showEditMenu: any;
  isEditing: any;
  editedText: any;
  id: string;
  message: string;
  time: number;
  user: string;
  userName?: string;
  userImg?: string;
  reactions?: any;
  reactionArray?: any[];
}