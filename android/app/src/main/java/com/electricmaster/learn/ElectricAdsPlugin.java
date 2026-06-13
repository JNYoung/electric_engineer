package com.electricmaster.learn;

import android.app.Activity;
import android.view.View;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ElectricAds")
public class ElectricAdsPlugin extends Plugin {
    private Object bannerView;

    @Override
    public void load() {
        initializeAds();
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            initializeAds();
            call.resolve();
        });
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        String adUnitId = call.getString("adUnitId", BuildConfig.ADMOB_BANNER_AD_UNIT_ID);
        String position = call.getString("position", "bottom");
        int marginBottomDp = call.getInt("marginBottomDp", 0);
        int marginTopDp = call.getInt("marginTopDp", 0);

        if (!BuildConfig.GOOGLE_PLAY_SERVICES_ENABLED || adUnitId == null || adUnitId.length() == 0) {
            call.resolve();
            return;
        }

        getActivity().runOnUiThread(() -> {
            Activity activity = getActivity();
            FrameLayout root = activity.findViewById(android.R.id.content);
            removeBanner();

            try {
                Class<?> adViewClass = Class.forName("com.google.android.gms.ads.AdView");
                Class<?> adSizeClass = Class.forName("com.google.android.gms.ads.AdSize");
                Class<?> adRequestClass = Class.forName("com.google.android.gms.ads.AdRequest");
                Class<?> adRequestBuilderClass = Class.forName("com.google.android.gms.ads.AdRequest$Builder");
                Object adView = adViewClass.getConstructor(android.content.Context.class).newInstance(activity);
                Object bannerSize = adSizeClass.getField("BANNER").get(null);
                Object adRequestBuilder = adRequestBuilderClass.getConstructor().newInstance();
                Object adRequest = adRequestBuilderClass.getMethod("build").invoke(adRequestBuilder);

                adViewClass.getMethod("setAdSize", adSizeClass).invoke(adView, bannerSize);
                adViewClass.getMethod("setAdUnitId", String.class).invoke(adView, adUnitId);

                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );
                params.gravity = "top".equals(position)
                        ? Gravity.TOP | Gravity.CENTER_HORIZONTAL
                        : Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
                params.topMargin = dpToPx(marginTopDp);
                params.bottomMargin = dpToPx(marginBottomDp);

                root.addView((View) adView, params);
                ((View) adView).bringToFront();
                adViewClass.getMethod("loadAd", adRequestClass).invoke(adView, adRequest);
                bannerView = adView;
            } catch (Exception ignored) {
                bannerView = null;
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            removeBanner();
            call.resolve();
        });
    }

    private void removeBanner() {
        if (bannerView == null) return;
        View banner = (View) bannerView;
        ViewGroup parent = (ViewGroup) banner.getParent();
        if (parent != null) {
            parent.removeView(banner);
        }
        try {
            bannerView.getClass().getMethod("destroy").invoke(bannerView);
        } catch (Exception ignored) {
            // Banner teardown is best-effort because ads are flavor-optional.
        }
        bannerView = null;
    }

    private void initializeAds() {
        if (!BuildConfig.GOOGLE_PLAY_SERVICES_ENABLED) return;
        try {
            Class<?> mobileAdsClass = Class.forName("com.google.android.gms.ads.MobileAds");
            mobileAdsClass.getMethod("initialize", android.content.Context.class).invoke(null, getContext());
        } catch (Exception ignored) {
            // Google Play services are intentionally absent from domestic flavors.
        }
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getContext().getResources().getDisplayMetrics().density);
    }
}
