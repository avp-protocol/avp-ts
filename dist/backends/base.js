/**
 * Base backend interface for AVP.
 */
import { defaultCapabilities, defaultLimits, } from "../types.js";
/** Abstract base class for AVP backends */
export class BackendBase {
    /** Return backend capabilities */
    get capabilities() {
        return defaultCapabilities();
    }
    /** Return backend limits */
    get limits() {
        return defaultLimits();
    }
    /** Get the backend descriptor */
    getDescriptor() {
        return {
            type: this.backendType,
            id: this.backendId,
            status: "available",
            info: this.getInfo(),
        };
    }
    /** Get backend-specific information */
    getInfo() {
        return {};
    }
    /**
     * Rotate a secret value.
     *
     * @param workspace - Workspace identifier
     * @param name - Secret name
     * @param newValue - New secret value
     * @returns New version number
     * @throws SecretNotFoundError if secret doesn't exist
     */
    async rotate(workspace, name, newValue) {
        // Default implementation: verify exists, then store
        await this.getMetadata(workspace, name); // Throws if not found
        const result = await this.store(workspace, name, newValue);
        return result.version;
    }
    /** Close the backend and release resources */
    async close() {
        // Default: no-op
    }
}
//# sourceMappingURL=base.js.map