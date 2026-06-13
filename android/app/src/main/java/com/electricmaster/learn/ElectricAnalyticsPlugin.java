package com.electricmaster.learn;

import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.lang.reflect.Method;
import java.util.Iterator;

@CapacitorPlugin(name = "ElectricAnalytics")
public class ElectricAnalyticsPlugin extends Plugin {
    private Object analytics;

    @Override
    public void load() {
        if (!BuildConfig.GOOGLE_PLAY_SERVICES_ENABLED) return;
        analytics = createFirebaseAnalytics();
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        if (analytics == null) {
            call.resolve();
            return;
        }

        String name = sanitizeName(call.getString("name", "app_event"));
        JSObject params = call.getObject("params");
        invokeAnalytics("logEvent", new Class[]{String.class, Bundle.class}, name, toBundle(params));
        call.resolve();
    }

    @PluginMethod
    public void setUserId(PluginCall call) {
        if (analytics != null) {
            invokeAnalytics("setUserId", new Class[]{String.class}, call.getString("userId"));
        }
        call.resolve();
    }

    @PluginMethod
    public void setUserProperty(PluginCall call) {
        if (analytics == null) {
            call.resolve();
            return;
        }

        String name = sanitizeName(call.getString("name", "property"));
        String value = call.getString("value", "");
        invokeAnalytics("setUserProperty", new Class[]{String.class, String.class}, name, value);
        call.resolve();
    }

    private Object createFirebaseAnalytics() {
        try {
            Class<?> analyticsClass = Class.forName("com.google.firebase.analytics.FirebaseAnalytics");
            Method getInstance = analyticsClass.getMethod("getInstance", android.content.Context.class);
            return getInstance.invoke(null, getContext());
        } catch (Exception ignored) {
            return null;
        }
    }

    private void invokeAnalytics(String methodName, Class<?>[] parameterTypes, Object... args) {
        try {
            Method method = analytics.getClass().getMethod(methodName, parameterTypes);
            method.invoke(analytics, args);
        } catch (Exception ignored) {
            // Native analytics is optional and must not block app flows.
        }
    }

    private Bundle toBundle(JSObject params) {
        Bundle bundle = new Bundle();
        if (params == null) return bundle;

        Iterator<String> keys = params.keys();
        while (keys.hasNext()) {
            String rawKey = keys.next();
            String key = sanitizeName(rawKey);
            try {
                Object value = params.get(rawKey);
                if (value == null) continue;
                if (value instanceof Integer) {
                    bundle.putLong(key, ((Integer) value).longValue());
                } else if (value instanceof Long) {
                    bundle.putLong(key, (Long) value);
                } else if (value instanceof Float) {
                    bundle.putDouble(key, ((Float) value).doubleValue());
                } else if (value instanceof Double) {
                    bundle.putDouble(key, (Double) value);
                } else if (value instanceof Boolean) {
                    bundle.putString(key, value.toString());
                } else {
                    bundle.putString(key, String.valueOf(value));
                }
            } catch (JSONException ignored) {
                // Skip malformed values rather than blocking telemetry dispatch.
            }
        }
        return bundle;
    }

    private String sanitizeName(String value) {
        String normalized = value == null ? "event" : value.replaceAll("[^A-Za-z0-9_]", "_");
        if (normalized.length() == 0 || !Character.isLetter(normalized.charAt(0))) {
            normalized = "e_" + normalized;
        }
        return normalized.length() > 40 ? normalized.substring(0, 40) : normalized;
    }
}
