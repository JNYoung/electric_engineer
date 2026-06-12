package com.electricmaster.learn;

import android.app.Activity;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.MobileAds;

@CapacitorPlugin(name = "ElectricAds")
public class ElectricAdsPlugin extends Plugin {
    private AdView bannerView;

    @Override
    public void load() {
        MobileAds.initialize(getContext());
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            MobileAds.initialize(getContext());
            call.resolve();
        });
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        String adUnitId = call.getString("adUnitId", BuildConfig.ADMOB_BANNER_AD_UNIT_ID);
        String position = call.getString("position", "bottom");
        int marginBottomDp = call.getInt("marginBottomDp", 0);
        int marginTopDp = call.getInt("marginTopDp", 0);

        getActivity().runOnUiThread(() -> {
            Activity activity = getActivity();
            FrameLayout root = activity.findViewById(android.R.id.content);
            removeBanner();

            bannerView = new AdView(activity);
            bannerView.setAdSize(AdSize.BANNER);
            bannerView.setAdUnitId(adUnitId);

            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            params.gravity = "top".equals(position)
                    ? Gravity.TOP | Gravity.CENTER_HORIZONTAL
                    : Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
            params.topMargin = dpToPx(marginTopDp);
            params.bottomMargin = dpToPx(marginBottomDp);

            root.addView(bannerView, params);
            bannerView.loadAd(new AdRequest.Builder().build());
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
        ViewGroup parent = (ViewGroup) bannerView.getParent();
        if (parent != null) {
            parent.removeView(bannerView);
        }
        bannerView.destroy();
        bannerView = null;
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getContext().getResources().getDisplayMetrics().density);
    }
}
