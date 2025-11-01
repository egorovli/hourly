/**
 * ValidateOAuthStateCommand - Command Object
 *
 * Describes the input required to validate and consume an OAuth state token.
 * Used by the ValidateOAuthStateUseCase.
 */
export interface ValidateOAuthStateCommand {
	/**
	 * OAuth state token returned by the provider after authorization.
	 */
	state: string
}
