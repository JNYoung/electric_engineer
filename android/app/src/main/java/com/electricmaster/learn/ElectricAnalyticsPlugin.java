package com.electricmaster.learn;

import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.analytics.FirebaseAnalytics;

import org.json.JSONException;

import java.util.Iterator;

@CapacitorPlugin(name = "ElectricAnalytics")
public class ElectricAnalyticsPlugin extends Plugin {
    private FirebaseAnalytics analytics;

    @Override
    public void load() {
        analytics = FirebaseAnalytics.getInstance(getContext());
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        String name = sanitizeName(call.getString("name", "app_event"));
        JSObject params = call.getObject("params");
        analytics.logEvent(name, toBundle(params));
        call.resolve();
    }

    @PluginMethod
    public void setUserId(PluginCall call) {
        analytics.setUserId(call.getString("userId"));
        call.resolve();
    }

    @PluginMethod
    public void setUserProperty(PluginCall call) {
        String name = sanitizeName(call.getString("name", "property"));
        String value = call.getString("value", "");
        analytics.setUserProperty(name, value);
        call.resolve();
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
