import { ApiProperty } from "@nestjs/swagger";
import { User } from "../../user/entities/user.entity";
import { Drawing } from "./drawing.entity";

export enum CommentType {
  GENERAL = "general",
  ANNOTATION = "annotation",
  REVIEW_NOTE = "review_note",
  CHANGE_REQUEST = "change_request",
  APPROVAL_NOTE = "approval_note",
}

export class DrawingComment {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Parent drawing", type: () => Drawing })
  drawing: Drawing;

  @ApiProperty({ description: "User who made the comment", type: () => User })
  user: User;

  @ApiProperty({ description: "Comment text" })
  commentText: string;

  @ApiProperty({ description: "Type of comment", enum: CommentType })
  commentType: CommentType;

  @ApiProperty({ description: "X position for annotation", required: false })
  positionX?: number;

  @ApiProperty({ description: "Y position for annotation", required: false })
  positionY?: number;

  @ApiProperty({
    description: "Page number for multi-page documents",
    required: false,
  })
  pageNumber?: number;

  @ApiProperty({ description: "Whether the comment is resolved" })
  isResolved: boolean;

  @ApiProperty({
    description: "Parent comment for replies",
    type: () => DrawingComment,
    required: false,
  })
  parentComment?: DrawingComment;

  @ApiProperty({ description: "Creation date" })
  createdAt: Date;

  @ApiProperty({ description: "Last update date" })
  updatedAt: Date;
}
