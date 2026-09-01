interface AvatarState {
  moveSpeed: number;
  isSprinting: boolean;
  isGrounded: boolean;
  isInWater: boolean;
  interactTime: number;
  collectTime: number;
  landingImpact: number;
  turnRate: number;
  puzzleProximity: number;
}

export const avatarState: AvatarState = {
  moveSpeed: 0,
  isSprinting: false,
  isGrounded: true,
  isInWater: false,
  interactTime: 0,
  collectTime: 0,
  landingImpact: 0,
  turnRate: 0,
  puzzleProximity: 0,
};
