const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

const getAppParams = () => {
	if (getAppParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	// Always prefer baked-in env vars over localStorage for critical config
	const envAppId = import.meta.env.VITE_BASE44_APP_ID;
	const envAppBaseUrl = import.meta.env.VITE_BASE44_APP_BASE_URL;
	const envFunctionsVersion = import.meta.env.VITE_BASE44_FUNCTIONS_VERSION;
	if (envAppId) storage.setItem('base44_app_id', envAppId);
	if (envAppBaseUrl) storage.setItem('base44_app_base_url', envAppBaseUrl);
	if (envFunctionsVersion) storage.setItem('base44_functions_version', envFunctionsVersion);
	return {
		appId: envAppId || getAppParamValue("app_id"),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: envFunctionsVersion || getAppParamValue("functions_version"),
		appBaseUrl: envAppBaseUrl || getAppParamValue("app_base_url"),
	}
}


export const appParams = {
	...getAppParams()
}
