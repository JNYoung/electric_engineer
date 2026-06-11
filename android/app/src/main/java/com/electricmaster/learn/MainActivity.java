package com.electricmaster.learn;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ElectricAdsPlugin.class);
        registerPlugin(ElectricAnalyticsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
