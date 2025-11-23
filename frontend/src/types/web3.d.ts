// Web3 and MetaMask type declarations

interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    selectedAddress: string | null;
    chainId: string;
    networkVersion: string;
  };
}

// WebAuthn types for biometric authentication
interface PublicKeyCredential extends Credential {
  readonly rawId: ArrayBuffer;
  readonly response: AuthenticatorResponse;
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
}

interface AuthenticatorResponse {
  readonly clientDataJSON: ArrayBuffer;
}

interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
  readonly authenticatorData: ArrayBuffer;
  readonly signature: ArrayBuffer;
  readonly userHandle: ArrayBuffer | null;
}

interface AuthenticatorAttestationResponse extends AuthenticatorResponse {
  readonly attestationObject: ArrayBuffer;
}

interface PublicKeyCredentialCreationOptions {
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntity;
  challenge: BufferSource;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

interface PublicKeyCredentialRequestOptions {
  challenge: BufferSource;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

interface PublicKeyCredentialRpEntity {
  id?: string;
  name: string;
}

interface PublicKeyCredentialUserEntity {
  id: BufferSource;
  name: string;
  displayName: string;
}

interface PublicKeyCredentialParameters {
  type: PublicKeyCredentialType;
  alg: COSEAlgorithmIdentifier;
}

interface PublicKeyCredentialDescriptor {
  type: PublicKeyCredentialType;
  id: BufferSource;
  transports?: AuthenticatorTransport[];
}

interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  residentKey?: ResidentKeyRequirement;
  userVerification?: UserVerificationRequirement;
}

type PublicKeyCredentialType = "public-key";
type COSEAlgorithmIdentifier = number;
type AuthenticatorTransport = "usb" | "nfc" | "ble" | "internal";
type AuthenticatorAttachment = "platform" | "cross-platform";
type ResidentKeyRequirement = "discouraged" | "preferred" | "required";
type UserVerificationRequirement = "required" | "preferred" | "discouraged";
type AttestationConveyancePreference = "none" | "indirect" | "direct" | "enterprise";

interface AuthenticationExtensionsClientInputs {
  [key: string]: any;
}

interface AuthenticationExtensionsClientOutputs {
  [key: string]: any;
}

// Extend the global Navigator interface
interface Navigator {
  credentials: CredentialsContainer;
}

interface CredentialsContainer {
  create(options?: CredentialCreationOptions): Promise<Credential | null>;
  get(options?: CredentialRequestOptions): Promise<Credential | null>;
  preventSilentAccess(): Promise<void>;
  store(credential: Credential): Promise<Credential>;
}

interface CredentialCreationOptions {
  publicKey?: PublicKeyCredentialCreationOptions;
  signal?: AbortSignal;
}

interface CredentialRequestOptions {
  publicKey?: PublicKeyCredentialRequestOptions;
  signal?: AbortSignal;
  mediation?: CredentialMediationRequirement;
}

type CredentialMediationRequirement = "silent" | "optional" | "conditional" | "required";

// Extend PublicKeyCredential with static methods
interface PublicKeyCredentialStatic {
  isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean>;
  isConditionalMediationAvailable(): Promise<boolean>;
}

declare var PublicKeyCredential: PublicKeyCredentialStatic;